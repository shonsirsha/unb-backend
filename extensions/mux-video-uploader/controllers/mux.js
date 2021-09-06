const fetch = require("node-fetch");
const { getConfig } = require("../services/mux");
const pluginPkg = require("../package.json");
const pluginId = pluginPkg.name.replace(/^strapi-plugin-/i, "");
const model = `plugins::${pluginId}.mux-asset`;

module.exports = {
  async muxWebhookHandler(ctx) {
    const body = ctx.request.body;
    const sigHttpHeader = ctx.request.headers["mux-signature"];

    const config = await getConfig("general");

    if (
      sigHttpHeader === undefined ||
      sigHttpHeader === "" ||
      (Array.isArray(sigHttpHeader) && sigHttpHeader.length < 0)
    ) {
      ctx.throw(401, "Webhook signature is missing");
    }

    if (Array.isArray(sigHttpHeader) && sigHttpHeader.length > 1) {
      ctx.throw(401, "we have an unexpected amount of signatures");
    }

    let sig;

    if (Array.isArray(sigHttpHeader)) {
      sig = sigHttpHeader[0];
    } else {
      sig = sigHttpHeader;
    }

    const { type, data } = body;

    let payload;

    if (type === "video.upload.asset_created") {
      payload = {
        params: { upload_id: data.id },
        data: { asset_id: data.asset_id },
      };
    } else if (type === "video.asset.ready") {
      payload = {
        params: { asset_id: body.data.id },
        data: {
          playback_id: data.playback_ids[0].id,
          isReady: true,
        },
      };

      const res = await fetch(
        `https://api.mux.com/video/v1/assets/${body.data.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization:
              "Basic " +
              Buffer.from(
                `${config.access_token}:${config.secret_key}`
              ).toString("base64"),
          },
        }
      );

      let duration;
      const inv = await res.json();

      if (res.ok) {
        duration = inv.data.duration;
      } else {
        duration = 0;
      }

      // console.log(duration);
      // console.log("========");
      // console.log(inv);
      // console.log("=========");
      // console.log(res);

      payload = {
        ...payload,
        data: { ...payload.data, duration_seconds: duration.toString() },
      };
    } else {
      ctx.send("ignored");

      return;
    }

    const result = await strapi.entityService.update(payload, { model });
    ctx.send(result);
  },
  async testCheckDuration(ctx) {
    const config = await getConfig("general");

    const res = await fetch(
      `https://api.mux.com/video/v1/assets/Xdv00601s015HlDR02YdX6WxF6MS46gVR64xp02u02tzELoNc`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "Basic " +
            Buffer.from(`${config.access_token}:${config.secret_key}`).toString(
              "base64"
            ),
        },
      }
    );
    const inv = await res.json();

    if (res.ok) {
      return inv.data.duration;
    } else {
      return res;
    }
  },
};