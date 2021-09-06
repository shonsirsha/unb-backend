// const parse = require("pg-connection-string").parse;
// const config = parse(process.env.DATABASE_URL);

// module.exports = ({ env }) => ({
//   defaultConnection: "default",
//   connections: {
//     default: {
//       connector: "bookshelf",
//       settings: {
//         client: "postgres",
//         host: config.host,
//         port: config.port,
//         database: config.database,
//         username: config.user,
//         password: config.password,
//         ssl: {
//           rejectUnauthorized: false,
//         },
//       },
//       options: {
//         ssl: true,
//       },
//     },
//   },
// });

module.exports = ({ env }) => ({
  defaultConnection: "default",
  connections: {
    default: {
      connector: "bookshelf",
      settings: {
        client: "mysql",
        host: env("DATABASE_HOST", "45.87.81.102"),
        port: env.int("DATABASE_PORT", 3306),
        database: env("DATABASE_NAME", "u316443044_strapi"),
        user: env("DATABASE_USERNAME", "u316443044_strapi"),
        password: env("DATABASE_PASSWORD", "seanSaoirse55!"),
      },
      options: {
        pool: {
          min: 0,
          max: 15,
          idleTimeoutMillis: 210000,
          createTimeoutMillis: 210000,
          acquireTimeoutMillis: 210000,
        },
      },
    },
  },
});
