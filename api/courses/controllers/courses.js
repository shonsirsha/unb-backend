"use strict";
const { sanitizeEntity } = require("strapi-utils");

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  async find(ctx) {
    let entities;
    if (ctx.query._q) {
      entities = await strapi.services.courses.search(ctx.query);
    } else {
      entities = await strapi.services.courses.find(ctx.query);
    }

    const promises = entities.map(async (entity) => {
      let course = sanitizeEntity(entity, {
        model: strapi.models.courses,
      });
      let detailedCourse = await strapi
        .query("courses")
        .findOne({ id: course.id }); // this has 'detailed'/complete (but shallow) relationsF
      course.image = detailedCourse.poster.url;
      course.content_creator = detailedCourse.content_creator;
      course.thumbnail = detailedCourse.poster.formats.thumbnail.url;
      course.num_of_participants = detailedCourse.enrolled_users.length;
      course.enrolled_users = detailedCourse.enrolled_users;
      course.videos.map((vidEntity) => {
        delete vidEntity.video;
      });
      return course;
    });
    return Promise.all(promises);
  },

  async findAllNotTaken(ctx) {
    let entities;
    if (ctx.query._q) {
      entities = await strapi.services.courses.search(ctx.query);
    } else {
      entities = await strapi.services.courses.find(ctx.query);
    }
    const { uuid } = ctx.state.user;

    const promises = entities.map(async (entity) => {
      let course = sanitizeEntity(entity, {
        model: strapi.models.courses,
      });
      let detailedCourse = await strapi
        .query("courses")
        .findOne({ id: course.id }); // this has 'detailed'/complete (but shallow) relationsF
      course.image = detailedCourse.poster.url;
      course.content_creator = detailedCourse.content_creator;
      course.thumbnail = detailedCourse.poster.formats.thumbnail.url;
      course.num_of_participants = detailedCourse.enrolled_users.length;
      course.enrolled_users = detailedCourse.enrolled_users;

      course.videos.map((vidEntity) => {
        delete vidEntity.video;
      });
      return course;
    });
    let formedArr = Promise.all(promises);
    formedArr = formedArr.then((r) => {
      const cleanArr = r.filter((el, ix) => {
        const v = el.enrolled_users.findIndex((el) => el.uuid === uuid);
        let shouldBeReturned = false;
        if (v > -1) {
          console.log(el.title + " has been taken by user"); // this EL will be removed
          shouldBeReturned = false; // due to this
        } else {
          console.log(el.title + " has NOT been taken by user");
          shouldBeReturned = true;
        }
        return shouldBeReturned;
      });
      return cleanArr;
    });
    return formedArr;
  },

  async findAllTaken(ctx) {
    let entities;
    if (ctx.query._q) {
      entities = await strapi.services.courses.search(ctx.query);
    } else {
      entities = await strapi.services.courses.find(ctx.query);
    }
    const { uuid } = ctx.state.user;

    const promises = entities.map(async (entity) => {
      let course = sanitizeEntity(entity, {
        model: strapi.models.courses,
      });
      let detailedCourse = await strapi
        .query("courses")
        .findOne({ id: course.id }); // this has 'detailed'/complete (but shallow) relationsF
      course.image = detailedCourse.poster.url;
      course.content_creator = detailedCourse.content_creator;
      course.thumbnail = detailedCourse.poster.formats.thumbnail.url;
      course.num_of_participants = detailedCourse.enrolled_users.length;
      course.enrolled_users = detailedCourse.enrolled_users;

      course.videos.map((vidEntity) => {
        delete vidEntity.video;
      });
      return course;
    });
    let formedArr = Promise.all(promises);
    formedArr = formedArr.then((r) => {
      const cleanArr = r.filter((el, ix) => {
        const v = el.enrolled_users.findIndex((el) => el.uuid === uuid);
        let shouldBeReturned = false;
        if (v > -1) {
          console.log(el.title + " has been taken by user");
          shouldBeReturned = true;
        } else {
          console.log(el.title + " has NOT been taken by user"); // this EL will be removed
          shouldBeReturned = false; // due to this
        }
        return shouldBeReturned;
      });
      return cleanArr;
    });
    return formedArr;
  },
};
