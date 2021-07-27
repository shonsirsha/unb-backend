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
      //todo to  edit and add Full Name
      const course_uuid = uuidv4();
      await strapi.services.courses.update(
        { id: data.id },
        {
          uuid: course_uuid,
        }
      );
    },
  },
};
