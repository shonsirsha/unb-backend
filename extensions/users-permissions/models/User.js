const { v4: uuidv4 } = require("uuid");

module.exports = {
  lifecycles: {
    async beforeCreate(data) {},
    async create() {
      console.log("asd");
    },
    async afterCreate(data) {
      console.log(data);
      //todo to  edit and add Full Name
      const user_uuid = uuidv4();
      await strapi.plugins["users-permissions"].services.user.edit(
        { id: data.id },
        {
          uuid: user_uuid,
          username: user_uuid,
        }
      );
    },
  },
};
