const { v4: uuidv4 } = require("uuid");

module.exports = {
  lifecycles: {
    async beforeCreate(data) {},
    async create() {
      console.log("asd");
    },
    async afterCreate(data) {
      //todo to  edit and add Full Name
      const user_uuid = uuidv4();

      await strapi.plugins["users-permissions"].services.user.edit(
        { id: data.id },
        {
          uuid: user_uuid,
          username: user_uuid,
          first_name: data.first_name,
          last_name: data.last_name,
          dob: data.dob,
          onboarded: false,
        }
      );
    },
  },
};
