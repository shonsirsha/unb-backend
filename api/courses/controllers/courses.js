"use strict";
const { sanitizeEntity } = require("strapi-utils");
const fetch = require("node-fetch");

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

const removePropFromArray = (arr, prop, dontRemoveFirst) => {
  arr.map((x, ix) => {
    if (dontRemoveFirst) {
      if (ix !== 0) {
        delete x[prop];
      }
    } else {
      delete x[prop];
    }
  });
};

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
  // async xenditCbTest(ctx) {
  //   const { payer_email, external_id } = ctx.request.body;
  //   const pendingPayment = await strapi
  //     .query("waiting-payment")
  //     .find({ ex_id: `${external_id}` });
  //   if (pendingPayment.length > 0) {
  //     const { user, course } = pendingPayment[0];

  //     // get this exact course via a standalone query
  //     // due to pendingPayment not returning enrolled_users[] and paid_users[]
  //     //but it does return paid_users_detail[]
  //     const exactCourse = await strapi.query("courses").find({ id: course.id });
  //     const { paid_users, enrolled_users } = exactCourse[0];

  //     const userEmailFromDb = user.email;
  //     // just for good measure
  //     if (payer_email === userEmailFromDb) {
  //       const updateCourse = await strapi.query("courses").update(
  //         { id: course.id },
  //         {
  //           paid_users_detail: [
  //             ...course.paid_users_detail,
  //             { date: new Date(), user },
  //           ],
  //           paid_users: [...paid_users, user],
  //           enrolled_users: [...enrolled_users, user],
  //         }
  //       );

  //       if (Object.keys(updateCourse).length > 0) {
  //         return {
  //           message: "ok",
  //         };
  //       } else {
  //         return ctx.badRequest(null, {
  //           message: "Failed updating user and course upon payment",
  //         });
  //       }
  //     } else {
  //       return ctx.badRequest(null, {
  //         message: "not found",
  //       });
  //     }
  //   } else {
  //     return ctx.badRequest(null, {
  //       message: "not found",
  //     });
  //   }
  // },
  async xendit(ctx) {
    // this endpoint does:
    //1 . Call xendit API to create a new invoice_url
    //2. Create a new entry of waiting_payment with the corresponding: user, course, external_id, and invoice_url
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
  async rateCourse(ctx) {
    const { id } = ctx.state.user;
    const { uuid } = ctx.params;
    const { rate } = ctx.request.body;
    const course = await strapi.query("courses").find({ uuid });
    if (course.length === 1) {
      const newRating = course[0].rating.filter((rate) => {
        return rate.user.id !== id;
      });

      const result = await strapi
        .query("courses")
        .update({ uuid }, { rating: [...newRating, { rate, user: { id } }] });
      return {
        course: result,
      };
    } else {
      return ctx.notFound();
    }

    return "";
  },
  async enrollCourse(ctx) {
    const { id } = ctx.state.user;
    const { uuid } = ctx.params;
    const course = await strapi.query("courses").find({ uuid });
    if (course.length === 1) {
      const result = await strapi
        .query("courses")
        .update(
          { uuid },
          { enrolled_users: [...course[0].enrolled_users, { id }] }
        );
      return {
        course: result,
      };
    } else {
      return ctx.notFound();
    }
  },
  async find(ctx) {
    let entities;
    let promises;
    let loggedIn = false;
    if (ctx.query._q) {
      entities = await strapi.services.courses.search(ctx.query);
    } else {
      entities = await strapi.services.courses.find(ctx.query);
    }

    if (ctx.state.user) {
      // logged in / authed request
      loggedIn = true;
    }

    promises = entities.map(async (entity) => {
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
      course.total_rating =
        course.rating.length > 0
          ? (
              course.rating
                .map((r) => r.rate)
                .reduce((prev, curr) => prev + curr, 0) / course.rating.length
            ).toPrecision(2)
          : 0;

      if (loggedIn) {
        const userEnrolled = course.enrolled_users.some((user) => {
          return user.uuid === ctx.state.user.uuid;
        });
        const userPaid = course.paid_users.some((user) => {
          return user.uuid === ctx.state.user.uuid;
        });
        course.enrolled = userEnrolled;
        course.paid = userPaid;
        if (!userPaid) {
          course.videos.map((courseObj, ix) => {
            if (ix !== 0) {
              Object.keys(courseObj.video).map((courseProp) => {
                if (courseProp !== "title" && courseProp !== "video") {
                  delete courseObj.video[courseProp];
                }
              });
            }
          });
        }
      } else {
        course.enrolled = false;
        course.paid = false;
        course.videos.map((courseObj, ix) => {
          Object.keys(courseObj.video).map((courseProp) => {
            if (courseProp !== "title" && courseProp !== "video") {
              delete courseObj[courseProp];
            }
          });
        });
      }

      if (course.content_creator) {
        delete course.content_creator.created_at;
        delete course.content_creator.updated_at;
        delete course.content_creator.created_by;
        delete course.content_creator.updated_by;
        delete course.content_creator.uuid;
        delete course.content_creator.published_at;
        delete course.content_creator.id;
      }
      delete course.enrolled_users;
      delete course.rating;
      delete course.paid_users;
      delete course.paid_users_detail;
      delete course.poster;
      delete course.published_at;
      delete course.created_at;
      delete course.updated_at;

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

      course.content_creator = detailedCourse.content_creator;
      course.num_of_participants = detailedCourse.enrolled_users.length;
      course.enrolled_users = detailedCourse.enrolled_users;
      course.total_rating = (
        course.rating
          .map((r) => r.rate)
          .reduce((prev, curr) => prev + curr, 0) / course.rating.length
      ).toPrecision(2);
      course.videos.map((vidEntity) => {
        delete vidEntity.video;
      });
      if (course.poster) {
        course.image = detailedCourse.poster.url;
        course.thumbnail = detailedCourse.poster.formats.thumbnail.url;
        delete course.poster;
      }
      if (course.content_creator) {
        delete course.content_creator.created_at;
        delete course.content_creator.updated_at;
        delete course.content_creator.created_by;
        delete course.content_creator.updated_by;
        delete course.content_creator.uuid;
        delete course.content_creator.published_at;
        delete course.content_creator.id;
      }
      delete course.rating;
      delete course.paid_users;
      delete course.paid_users_detail;
      delete course.published_at;
      delete course.created_at;
      delete course.updated_at;
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
    const { uuid } = ctx.state.user;
    const userCourses = await strapi
      .query("courses")
      .find({ "enrolled_users.uuid": uuid });
    const userCourseFixed = userCourses.map(async (entity) => {
      let course = sanitizeEntity(entity, {
        model: strapi.models.courses,
      });
      if (course.poster) delete course.poster;
      let detailedCourse = await strapi
        .query("courses")
        .findOne({ id: course.id }); // this has 'detailed'/complete relations
      course.image = detailedCourse.poster.url;
      course.content_creator = detailedCourse.content_creator;
      course.thumbnail = detailedCourse.poster.formats.thumbnail.url;
      course.num_of_participants = detailedCourse.enrolled_users.length;

      const userHasBoughtCourse = detailedCourse.paid_users.some((user) => {
        return user.uuid === uuid;
      });

      const userRatingIndex = detailedCourse.rating.findIndex((rating) => {
        return rating.user.uuid === uuid;
      });

      if (userHasBoughtCourse) {
        course.paid = true;
      } else {
        course.paid = false;
      }

      if (userRatingIndex >= 0) {
        course.my_rating = detailedCourse.rating[userRatingIndex].rate;
      } else {
        course.my_rating = 0;
      }
      delete course.total_rating; // no idea how it's still there
      delete course.enrolled_users;
      delete course.updated_at;
      delete course.paid_users;
      delete course.paid_users_detail;
      delete course.rating;
      delete course.published_at;
      delete course.created_at;
      delete course.updated_at;
      if (course.content_creator) {
        delete course.content_creator.created_at;
        delete course.content_creator.updated_at;
        delete course.content_creator.created_by;
        delete course.content_creator.updated_by;
        delete course.content_creator.uuid;
        delete course.content_creator.published_at;
        delete course.content_creator.id;
      }
      course.videos.map((vidEntity, ix) => {
        if (ix !== 0) {
          delete vidEntity.video;
        }
      });
      return course;
    });
    let formedArr = Promise.all(userCourseFixed);
    return formedArr;
  },
};
