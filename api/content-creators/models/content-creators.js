"use strict";
const { v4: uuidv4 } = require("uuid");
const slugify = require("slugify");
const { default: createStrapi } = require("strapi");

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#lifecycle-hooks)
 * to customize this model
 */

module.exports = {
  lifecycles: {
    beforeCreate(data) {
      if (!data.content_creator_type) {
        data.content_creator_type = "UNBELIEVABLE";
      }
    },
    async afterCreate(data) {
      await strapi.services["content-creators"].update(
        { id: data.id },
        {
          uuid: uuidv4(),
        }
      );
      if (data.content_creator_type === "COLLABORATOR") {
        const code = `${slugify(
          data.full_name.toLowerCase()
        )}-${new Date().getFullYear()}-${Date.now().toString().slice(-3)}`;
        await strapi.services["register-link"].create({
          link: `${process.env.FRONTEND_HOST}/daftar?register_code=${code}`,
          code,
          code_type: "COLLABORATOR",
          ["content_creator"]: { id: data.id },
        });
      }
    },
  },
};
