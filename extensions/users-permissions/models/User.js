const { v4: uuidv4 } = require("uuid");

module.exports = {
  lifecycles: {
    async beforeCreate(data) {},
    async create() {
      console.log("asd");
    },
    async afterCreate(data) {
      //todo to hit
      const user_uuid = uuidv4();
      await strapi.plugins["users-permissions"].services.user.edit(
        { id: data.id },
        { uuid: user_uuid }
      );
    },
  },
};
