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
      console.log("=============");
      console.log(data);
      console.log("=============");

      console.log(data.first_name);
      await strapi.plugins["users-permissions"].services.user.edit(
        { id: data.id },
        {
          uuid: user_uuid,
          username: user_uuid,
          first_name: "NAMA DEPAN",
          last_name: data.last_name,
          onboarded: false,
        }
      );
    },
  },
};
