"use strict";

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  async create(ctx) {
    const { feedback_text, category } = ctx.request.body;

    const { id } = ctx.state.user;
    await strapi
      .query("feedback")
      .create({ ...ctx.request.body, user: { id } });
    return {
      message: "success",
    };
  },
};
