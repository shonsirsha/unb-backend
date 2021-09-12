const _ = require("lodash");
const { sanitizeEntity } = require("strapi-utils");
const apiUploadController = require("./upload/api");
const adminUploadController = require("./upload/admin");

const resolveController = (ctx) => {
  const {
    state: { isAuthenticatedAdmin },
  } = ctx;

  return isAuthenticatedAdmin ? adminUploadController : apiUploadController;
};

const resolveControllerMethod = (method) => (ctx) => {
  const controller = resolveController(ctx);
  const callbackFn = controller[method];

  if (!_.isFunction(callbackFn)) {
    return ctx.notFound();
  }

  return callbackFn(ctx);
};
module.exports = {
  async profilePictureUpload(ctx) {
    let myRequest = {
      ref: "user",
      refId: ctx.state.user.id,
      source: "users-permissions",
      field: "profile_picture",
      path: `profile-pictures/${ctx.state.user.uuid}`,
    };

    const user = await strapi.plugins["users-permissions"].services.user.fetch({
      id: ctx.state.user.id,
    });
    let profilPicId;
    if (user && user.profile_picture) {
      profilPicId = user.profile_picture.id;
      const currentProfilePic = await strapi.plugins[
        "upload"
      ].services.upload.fetch({
        id: profilPicId,
      });

      if (currentProfilePic) {
        // delete current profile pic from AWS and database
        await strapi.plugins["upload"].services.upload.remove(
          currentProfilePic
        );
      } else {
        console.log("Profile pic is not available for some reason...");
      }
    }

    ctx.request.body = myRequest;
    const isUploadDisabled =
      _.get(strapi.plugins, "upload.config.enabled", true) === false;

    if (isUploadDisabled) {
      throw strapi.errors.badRequest(null, {
        errors: [
          { id: "Upload.status.disabled", message: "File upload is disabled" },
        ],
      });
    }

    const {
      query: { id },
      request: { files: { files } = {} },
    } = ctx;
    const controller = resolveController(ctx);

    if (id && (_.isEmpty(files) || files.size === 0)) {
      return controller.updateFileInfo(ctx);
    }

    if (_.isEmpty(files) || files.size === 0) {
      throw strapi.errors.badRequest(null, {
        errors: [{ id: "Upload.status.empty", message: "Files are empty" }],
      });
    }

    await (id ? controller.replaceFile : controller.uploadFiles)(ctx);
  },
};
