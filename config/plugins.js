module.exports = ({ env }) => ({
  // ...
  upload: {
    provider: "aws-s3",
    providerOptions: {
      accessKeyId: env("S3_ACCESS_KEY", "AKIAR542CBFUCLJTNUDE"),
      secretAccessKey: env(
        "S3_SECRET_ACCESS_KEY",
        "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"
      ),
      region: "ap-southeast-1",
      params: {
        Bucket: "unb-dev",
      },
    },
  },
  email: {
    provider: "nodemailer",
    providerOptions: {
      host: env("SMTP_HOST", "smtp.gmail.com"),
      port: env("SMTP_PORT", 587),
      auth: {
        user: env("SMTP_USERNAME"),
        pass: env("SMTP_PASSWORD"),
      },
      // ... any custom nodemailer options
    },
    settings: {
      defaultFrom: env("SMTP_USERNAME"),
      defaultReplyTo: env("SMTP_USERNAME"),
    },
  },
  // ...
});
