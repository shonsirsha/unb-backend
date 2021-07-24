"use strict";
const { sanitizeEntity } = require("strapi-utils");
const fetch = require("node-fetch");

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  async xenditCb(ctx) {
    if (
      ctx.request.header["x-callback-token"] !==
      process.env.XENDIT_CALLBACK_TOKEN
    ) {
      return "Not Found";
    }
    //callback / hook -
    //will be called automatically
    //from xendit after user has paid

    //callback method below will check if external_id and payer_email are valid
    //and match each other.
    //Both data will be checked against
    //the saved data in the waiting-payment model

    //if they are valid (exist and matching) then course model will be updated
    //with new enrolled_users, paid_users, and paid_users_detail

    console.log("callback called");
    const { external_id, payer_email } = ctx.request.body;
    const pendingPayment = await strapi
      .query("waiting-payment")
      .find({ ex_id: `${external_id}` });
    if (pendingPayment.length > 0) {
      console.log("pending payment found");

      const { user, course } = pendingPayment[0];
      const userEmailFromDb = user.email;

      // get this exact course via a standalone query
      // due to pendingPayment not returning enrolled_users[] and paid_users[]
      //but it does return paid_users_detail[]
      const exactCourse = await strapi.query("courses").find({ id: course.id });
      const { paid_users, enrolled_users } = exactCourse[0];

      // just for good measure
      if (payer_email === userEmailFromDb) {
        const updateCourse = await strapi.query("courses").update(
          { id: course.id },
          {
            paid_users_detail: [
              ...course.paid_users_detail,
              { date: new Date(), user },
            ],
            paid_users: [...paid_users, user],
            enrolled_users: [...enrolled_users, user],
          }
        );

        if (Object.keys(updateCourse).length > 0) {
          await strapi.query("waiting-payment").delete({ ex_id: external_id });
          console.log("success");

          return {
            message: "ok",
          };
        } else {
          console.log("Failed updating user and course upon payment");
          return ctx.badRequest(null, {
            message: "Failed updating user and course upon payment",
          });
        }
      } else {
        return ctx.badRequest(null, {
          message: "not found",
        });
      }
    } else {
      return ctx.badRequest(null, {
        message: "not found",
      });
    }
  },
  async xenditCbTest(ctx) {
    const { payer_email, external_id } = ctx.request.body;
    const pendingPayment = await strapi
      .query("waiting-payment")
      .find({ ex_id: `${external_id}` });
    if (pendingPayment.length > 0) {
      const { user, course } = pendingPayment[0];

      // get this exact course via a standalone query
      // due to pendingPayment not returning enrolled_users[] and paid_users[]
      //but it does return paid_users_detail[]
      const exactCourse = await strapi.query("courses").find({ id: course.id });
      const { paid_users, enrolled_users } = exactCourse[0];

      const userEmailFromDb = user.email;
      // just for good measure
      if (payer_email === userEmailFromDb) {
        const updateCourse = await strapi.query("courses").update(
          { id: course.id },
          {
            paid_users_detail: [
              ...course.paid_users_detail,
              { date: new Date(), user },
            ],
            paid_users: [...paid_users, user],
            enrolled_users: [...enrolled_users, user],
          }
        );

        if (Object.keys(updateCourse).length > 0) {
          return {
            message: "ok",
          };
        } else {
          return ctx.badRequest(null, {
            message: "Failed updating user and course upon payment",
          });
        }
      } else {
        return ctx.badRequest(null, {
          message: "not found",
        });
      }
    } else {
      return ctx.badRequest(null, {
        message: "not found",
      });
    }
  },
  async xendit(ctx) {
    console.log(ctx.request.body);
    const {
      amount,
      external_id,
      payer_email,
      description,
      redirect_url,
      courseId,
    } = ctx.request.body;
    //external_id is reference ID
    const res = await fetch(`https://api.xendit.co/v2/invoices`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Basic " +
          Buffer.from(`${process.env.XENDIT_API}:`).toString("base64"),
      },
      body: JSON.stringify({
        external_id,
        amount,
        payer_email,
        description,
        failure_redirect_url: redirect_url,
        success_redirect_url: redirect_url,
      }),
    });
    const inv = await res.json();

    if (!res.ok) {
      return ctx.badRequest(null, {
        message: inv.message,
      });
    } else {
      const user = ctx.state.user;
      await strapi.query("waiting-payment").create({
        ex_id: external_id,
        invoice_url: inv.invoice_url,
        user,
        course: { id: courseId },
      });

      return {
        invoice_url: inv.invoice_url,
      };
    }
  },
  async find(ctx) {
    let entities;
    if (ctx.query._q) {
      entities = await strapi.services.courses.search(ctx.query);
    } else {
      console.log(ctx.query);
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
      if (!ctx.query.slug) {
        course.videos.map((vidEntity) => {
          delete vidEntity.video;
        });
      }

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
          shouldBeReturned = false; // due to this
        } else {
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

      // course.videos.map((vidEntity) => {
      //   delete vidEntity.video;
      // });
      return course;
    });
    let formedArr = Promise.all(promises);
    formedArr = formedArr.then((r) => {
      const cleanArr = r.filter((el, _) => {
        const v = el.enrolled_users.findIndex((el) => el.uuid === uuid);
        let shouldBeReturned = false;
        if (v > -1) {
          shouldBeReturned = true;
        } else {
          shouldBeReturned = false; // due to this
        }
        return shouldBeReturned;
      });
      return cleanArr;
    });
    return formedArr;
  },
};
