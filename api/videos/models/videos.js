"use strict";
const fetch = require("node-fetch");
const { v4: uuidv4 } = require("uuid");

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#lifecycle-hooks)
 * to customize this model
 */
const getVideo = async (data) => {
  console.log("???", data.video_id);
  const res = await fetch(
    `${process.env.BUNNY_CDN_LIBRARY_URL}/${process.env.BUNNY_LIBRARY_ID}/videos/${data.video_id}`,
    {
      method: "GET",
      headers: {
        AccessKey: process.env.BUNNY_STREAM_API,
      },
    }
  );

  if (!res.ok) {
    throw strapi.errors.badRequest("Video not found on Bunny!");
  } else {
    const resData = await res.json();
    data.title = resData.title;
    data.duration = parseFloat(parseFloat(resData.length) - 1);
  }
};

const updateVideo = async (id, videoId, data) => {
  const res = await fetch(
    `${process.env.BUNNY_CDN_LIBRARY_URL}/${process.env.BUNNY_LIBRARY_ID}/videos/${videoId}`,
    {
      method: "GET",
      headers: {
        AccessKey: process.env.BUNNY_STREAM_API,
      },
    }
  );
  console.log(data);

  if (!res.ok) {
    throw strapi.errors.badRequest("Video not found on Bunny!");
  } else {
    const resData = await res.json();
    return resData.title;
  }
};

module.exports = {
  lifecycles: {
    async beforeCreate(data) {
      data.upload_id = uuidv4();
      await getVideo(data);
    },

    async beforeUpdate(params, data) {
      if (
        Object.keys(data)[0] !== "published_at" &&
        Object.keys(data).length !== 1
      ) {
        console.log("not publish");
        // clicking save
        await getVideo(data);
      } else {
        if (data.published_at !== null) {
          console.log(Date.now());
          let thisVideo = await strapi
            .query("videos")
            .findOne({ id: params.id });
          const title = await updateVideo(params.id, thisVideo.video_id, data);
          data.title = title;
        }
      }
    },
  },
};

// throw strapi.errors.badRequest("Please fill in content creator!");
