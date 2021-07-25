"use strict";

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */
const calculateHourDifference = (createdAt, today) => {
  const milliseconds = Math.abs(createdAt - today);
  const hours = milliseconds / 36e5;
  return hours;
}; // returns hour (float)
module.exports = {
  async findOneByMeByCourse(ctx) {
    const { uuid } = ctx.state.user;
    const { courseId } = ctx.request.body;
    const pendingPayment = await strapi
      .query("waiting-payment")
      .find({ "user.uuid": uuid, "course.id": courseId });
    if (pendingPayment.length === 1) {
      const { created_at } = pendingPayment[0];
      const difference = calculateHourDifference(created_at, new Date());
      if (difference <= 20) {
        return {
          valid: true,
        }; // not expiring soon
      } else {
        return {
          valid: false,
        }; // expiring soon
      }
    } else {
      return {
        valid: false, // pending payment does not exist
      };
    }
  },
};
