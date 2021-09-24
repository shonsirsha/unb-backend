// const Sentry = require("@sentry/node");
// Sentry.init({
//   dsn: "https://b02675ab740248f8acd18efc542f0bb4@o1011954.ingest.sentry.io/5976960",
//   environment: strapi.config.environment,
// });

// module.exports = (strapi) => {
//   return {
//     initialize() {
//       strapi.app.use(async (ctx, next) => {
//         try {
//           await next();
//         } catch (error) {
//           Sentry.captureException(error);
//           throw error;
//         }
//       });
//     },
//   };
// };
