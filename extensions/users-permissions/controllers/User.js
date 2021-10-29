const { sanitizeEntity } = require("strapi-utils");
const _ = require("lodash");
const client = require("@mailchimp/mailchimp_marketing");

const sanitizeUser = (user) =>
  sanitizeEntity(user, {
    model: strapi.query("user", "users-permissions").model,
  });
const mailChimpConfigSetup = () => {
  client.setConfig({
    apiKey: process.env.MAILCHIMP_API,
    server: process.env.MAILCHIMP_SERVER_PREFIX,
  });
};

const toMailchimp = async (user) => {
  const email_address = user.email;

  const response = await client.lists.addListMember(
    process.env.MAILCHIMP_LIST_ID,
    {
      email_address,
      status: "subscribed",
      tags: ["free"],
      merge_fields: {
        FNAME: user.first_name,
        LNAME: user.last_name,
        PHONE: user.phone_number ? user.phone_number : "",
      },
    }
  );
  return response;
};

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

  async applyCode(ctx) {
    // will be called on /auth/apply-code
    //if user just registered using non local provider with a register_code
    const { r_c_to_be_checked } = ctx.request.body;
    const { id } = ctx.state.user;

    const user = await strapi.plugins["users-permissions"].services.user.fetch({
      id,
    });

    if (!user.code_verified) {
      if (r_c_to_be_checked === "" || !r_c_to_be_checked) {
        await strapi.plugins["users-permissions"].services.user.edit(
          { id },
          { unverified_register_code: "", code_verified: true }
        );

        return {
          message: "no code applied",
        };
      }

      let register_code = await strapi
        .query("register-link")
        .findOne({ code: r_c_to_be_checked.toLowerCase() });

      if (
        register_code &&
        ((register_code.code_type === "COLLABORATOR" &&
          register_code.content_creator) ||
          (register_code.code_type === "AD" &&
            !register_code.content_creator)) &&
        register_code.active
      ) {
        console.log(register_code.active);
        await strapi.plugins["users-permissions"].services.user.edit(
          { id },
          {
            register_link: register_code.id,
            unverified_register_code: "",
            code_verified: true,
          }
        );
        return {
          message: "code successfully applied",
        };
      } else {
        await strapi.plugins["users-permissions"].services.user.edit(
          { id },
          { unverified_register_code: "", code_verified: true }
        );

        return {
          message: "no code applied",
        };
      }
    }

    return {
      message: "code successfully applied (alr verified)",
    };
  },

  async mailchimpRegister(ctx) {
    //register a user to mailchimp
    // (adding a contact with a tag of 'free' to the Audience)
    const userFetched = await strapi.plugins[
      "users-permissions"
    ].services.user.fetch({
      id: ctx.state.user.id,
    });

    if (userFetched && !userFetched.mailchimp_set) {
      mailChimpConfigSetup();
      await toMailchimp(ctx.state.user);

      return await strapi.plugins["users-permissions"].services.user.edit(
        { id: ctx.state.user.id },
        { mailchimp_set: true }
      );
    }

    return ctx.badRequest(null, {
      message: "not found",
    });
  },

  async me(ctx, req) {
    let user = ctx.state.user;

    if (!user) {
      return ctx.badRequest(null, [
        { messages: [{ id: "No authorization header was found" }] },
      ]);
    }

    const userFetched = await strapi.plugins[
      "users-permissions"
    ].services.user.fetch({
      id: user.id,
    });
    const { profile_picture } = userFetched;
    user = { ...user, profile_picture };

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
        console.log("ASD");
        console.log(userWithSameUsername);
        console.log(id);
        return ctx.badRequest(
          null
          // formatError({
          //   id: "Auth.form.error.username.taken",
          //   message: "username.alreadyTaken.",
          //   field: ["username"],
          // })
        );
      }
      console.log(userWithSameUsername.id);
      console.log(id);
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

    for (var key in updateData) {
      if (
        key === "provider" ||
        key === "wishlist" ||
        key === "uuid" ||
        key === "username" ||
        key === "referral_code" ||
        key === "register_link" ||
        key === "code_verified" ||
        key === "confirmed" ||
        key === "blocked" ||
        key === "role" ||
        key === "email" ||
        key === "created_by" ||
        key === "updated_by" ||
        key === "updated_at" ||
        key === "created_at" ||
        key === "profile_picture"
      ) {
        delete updateData[key];
      }
    }

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
    if (user.uuid === uuid) {
      // Validate given password against user query result password
      const validPassword = await strapi.plugins[
        "users-permissions"
      ].services.user.validatePassword(params.password, user.password);

      if (!validPassword) {
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

  async find(ctx, next, { populate } = {}) {
    let users;

    if (_.has(ctx.query, "_q")) {
      // use core strapi query to search for users
      users = await strapi
        .query("user", "users-permissions")
        .search(ctx.query, populate);
    } else {
      users = await strapi.plugins["users-permissions"].services.user.fetchAll(
        ctx.query,
        populate
      );
    }

    ctx.body = users.map(sanitizeUser);
  },
};

const getCourseVideosFromByCourseId = (myArray) => {
  const promises = myArray.map(async (course) => {
    // course.course_videos = coursesAPI.course_videos; // assign all the courses from "courses" to the user course's object (course) as course_videos
    return course;
  });
  return Promise.all(promises);
};
