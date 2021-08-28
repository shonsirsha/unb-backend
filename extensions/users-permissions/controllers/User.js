const { sanitizeEntity } = require("strapi-utils");
const { prependOnceListener } = require("strapi-utils/lib/logger");
const courses = require("../../../api/courses/services/courses");
const _ = require("lodash");

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
      await getCourseVideosFromByCourseId(me.courses); // gets all courses of this user
    }

    ctx.body = sanitizeUser(me);
  },

  async me(ctx, req) {
    let user = ctx.state.user;

    // console.log(ctx.request.header);

    if (!user) {
      return ctx.badRequest(null, [
        { messages: [{ id: "No authorization header was found" }] },
      ]);
    }

    // user.token = ctx.request.header.authorization;

    ctx.body = sanitizeUser(user);
  },

  async updateMe(ctx) {
    const advancedConfigs = await strapi
      .store({
        environment: "",
        type: "plugin",
        name: "users-permissions",
        key: "advanced",
      })
      .get();

    const { id } = ctx.state.user;

    const { email, username, password } = ctx.request.body;

    const user = await strapi.plugins["users-permissions"].services.user.fetch({
      id,
    });

    if (_.has(ctx.request.body, "email") && !email) {
      return ctx.badRequest("email.notNull");
    }

    if (_.has(ctx.request.body, "username") && !username) {
      return ctx.badRequest("username.notNull");
    }

    if (
      _.has(ctx.request.body, "password") &&
      !password &&
      user.provider === "local"
    ) {
      return ctx.badRequest("password.notNull");
    }

    if (_.has(ctx.request.body, "username")) {
      const userWithSameUsername = await strapi
        .query("user", "users-permissions")
        .findOne({ username });

      if (userWithSameUsername && userWithSameUsername.id != id) {
        return ctx.badRequest(
          null
          // formatError({
          //   id: "Auth.form.error.username.taken",
          //   message: "username.alreadyTaken.",
          //   field: ["username"],
          // })
        );
      }
    }

    if (_.has(ctx.request.body, "email") && advancedConfigs.unique_email) {
      const userWithSameEmail = await strapi
        .query("user", "users-permissions")
        .findOne({ email: email.toLowerCase() });

      if (userWithSameEmail && userWithSameEmail.id != id) {
        return ctx.badRequest(
          null
          // formatError({
          //   id: "Auth.form.error.email.taken",
          //   message: "Email already taken",
          //   field: ["email"],
          // })
        );
      }
      ctx.request.body.email = ctx.request.body.email.toLowerCase();
    }

    let updateData = {
      ...ctx.request.body,
    };

    if (_.has(ctx.request.body, "password") && password === user.password) {
      delete updateData.password;
    }

    const data = await strapi.plugins["users-permissions"].services.user.edit(
      { id },
      updateData
    );

    ctx.send(sanitizeUser(data));
  },

  isLocalProvider: async (ctx) => {
    const { email } = ctx.request.body;
    const user = await strapi
      .query("user", "users-permissions")
      .findOne({ email });
    if (user === null) return { localProvider: false };
    if (user.provider === "local") {
      return { localProvider: true };
    }
    return { localProvider: false };
  },

  passwordReset: async (ctx) => {
    // Get posted params
    // const params = JSON.parse(ctx.request.body); //if post raw object using Postman
    const params = ctx.request.body;

    const { uuid } = ctx.state.user;

    // The identifier is required.
    if (!params.identifier) {
      return ctx.badRequest(null, {
        error: "wrong.password",
      });
    }

    // Other params validation

    // Get User based on identifier
    const user = await strapi
      .query("user", "users-permissions")
      .findOne({ username: params.identifier });
    console.log(params.identifier);
    if (user.uuid === uuid) {
      // Validate given password against user query result password
      const validPassword = await strapi.plugins[
        "users-permissions"
      ].services.user.validatePassword(params.password, user.password);

      if (!validPassword) {
        console.log("SX");
        return ctx.badRequest(null, {
          error: "wrong.password",
        });
      } else {
        // Generate new hash password
        const password = await strapi.plugins[
          "users-permissions"
        ].services.user.hashPassword({ password: params.newPassword });
        // Update user password
        await strapi
          .query("user", "users-permissions")
          .update({ id: user.id }, { resetPasswordToken: null, password });

        // Return new jwt token
        ctx.send({
          jwt: strapi.plugins["users-permissions"].services.jwt.issue({
            id: user.id,
          }),
        });
      }
    }
  },
};

const getCourseVideosFromByCourseId = (myArray) => {
  const promises = myArray.map(async (course) => {
    // course.course_videos = coursesAPI.course_videos; // assign all the courses from "courses" to the user course's object (course) as course_videos
    return course;
  });
  return Promise.all(promises);
};
