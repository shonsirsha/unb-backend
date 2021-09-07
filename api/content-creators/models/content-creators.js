"use strict";
const { v4: uuidv4 } = require("uuid");

const { default: createStrapi } = require("strapi");

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#lifecycle-hooks)
 * to customize this model
 */

module.exports = {
  lifecycles: {
    async afterCreate(data) {
      await strapi.services.content_creators.update(
        { id: data.id },
        {
          uuid: uuidv4(),
        }
      );
    },
  },
};
