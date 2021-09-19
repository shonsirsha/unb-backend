"use strict";
const { v4: uuidv4 } = require("uuid");

const { default: createStrapi } = require("strapi");

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#lifecycle-hooks)
 * to customize this model
 */

const checkVideos = (data) => {
  if (data.videos.length > 0) {
    const ix = data.videos.findIndex((v) => !v.video);
    const x = data.videos.findIndex((v) => !v.day_title || !v.day_title === "");
    if (ix !== -1 || x !== -1) {
      // if a video property without an actual (mux) video found:
      throw strapi.errors.badRequest("One or more video(s) are incomplete");
    }
  } else {
    throw strapi.errors.badRequest("A course must have a video");
  }
};

module.exports = {
  lifecycles: {
    async beforeUpdate(_, data) {
      if (Object.keys(data).length > 1) {
        // this is on "saving"
        if (!data.announcement || !data.course_price) {
          throw strapi.errors.badRequest(
            "A course must have an announcement and a price"
          );
        }

        checkVideos(data);
      }
    },

    async beforeCreate(data) {
      checkVideos(data);
    },
    async afterCreate(data) {
      const course_uuid = uuidv4();
      await strapi.services.courses.update(
        { id: data.id },
        {
          uuid: course_uuid,
        }
      );

      await strapi.services.announcement.create({
        pengumuman: [],
        course_name: data.title,
        course: data.id,
      });

      await strapi.services.price.create({
        price: "5000",
        course_name: data.title,
        course: data.id,
      });
    },
  },
};
