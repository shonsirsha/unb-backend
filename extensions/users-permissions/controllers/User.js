const { sanitizeEntity } = require("strapi-utils");
const { prependOnceListener } = require("strapi-utils/lib/logger");
const courses = require("../../../api/courses/services/courses");

const sanitizeUser = (user) =>
  sanitizeEntity(user, {
    model: strapi.query("user", "users-permissions").model,
  });

module.exports = {
  async customMe(ctx) {
    const user = ctx.state.user;

    if (!user) {
      return ctx.badRequest(null, [
        { messages: [{ id: "No authorization header was found" }] },
      ]);
    }

    let me = await strapi.query("user", "users-permissions").findOne({
      id: user.id,
    });

    if (me.courses) {
      await getCourseVideosFromByCourseId(me.courses);
    }

    ctx.body = sanitizeUser(me);
  },
};

const getCourseVideosFromByCourseId = (myArray) => {
  const promises = myArray.map(async (course) => {
    const coursesAPI = await strapi
      .query("courses")
      .findOne({ id: course.id }, ["course_videos", "course_videos.mux_asset"]);

    if (coursesAPI.paid_users) {
      delete coursesAPI.paid_users;
    }
    course.course_videos = coursesAPI.course_videos;
    return course;
  });
  return Promise.all(promises);
};
