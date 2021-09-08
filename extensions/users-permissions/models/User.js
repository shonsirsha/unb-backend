const { v4: uuidv4 } = require("uuid");

module.exports = {
  lifecycles: {
    async beforeCreate(data) {
      const user_uuid = uuidv4();
      data.username = user_uuid;
      data.uuid = user_uuid;
    },

    async afterCreate(data) {
      //todo to  edit and add Full Name

      await strapi.plugins["users-permissions"].services.user.edit(
        { id: data.id },
        {
          first_name: data.first_name,
          last_name: data.last_name,
          dob: data.dob,
          onboarded: false,
        }
      );
    },
  },
};
