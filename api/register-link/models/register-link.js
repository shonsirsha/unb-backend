"use strict";

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#lifecycle-hooks)
 * to customize this model
 */

module.exports = {
  lifecycles: {
    beforeCreate(data) {
      const code = data.code.toLowerCase();
      data.code = code;
      data.link = `${process.env.FRONTEND_HOST}/daftar?register_code=${code}`;
      if (!data.code_type) {
        data.code_type = "AD";
      } else if (data.code_type === "COLLABORATOR" && !data.content_creator) {
        throw strapi.errors.badRequest("Please fill in content creator!");
      } else if (data.code_type === "AD" && data.content_creator) {
        throw strapi.errors.badRequest(
          "'AD' type code can't have content creator!"
        );
      }
    },
  },
};
