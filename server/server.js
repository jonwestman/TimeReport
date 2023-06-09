/*
  The application is built using the following technologies:
    - React
    - Express
    - Node
    - Notion API
    - SQLite

  Express is used to create the server and handle the routes.
  Requests to Notion are made using the official Notion API client, the exceptions being
  when starting up and checking if the internal token is valid
  and when registering a public integration token with Notion. In those cases, Axios is used.

 */

const express = require("express");
const bearerToken = require("express-bearer-token");
const db = require("./db");
const morgan = require("morgan");
const dotenv = require("dotenv");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const fs = require("fs");
const swaggerDocumentPath = "./swagger.json";
const { ClientPoolFactory } = require("./notion_client");
const UserService = require("./service/user_service");
const ProjectsService = require("./service/projects_service");
const TimeReportsService = require("./service/timereports_service");
const PeopleService = require("./service/people_service");
const LoginService = require("./service/login_service");
const PageService = require("./service/one_to_one_service");
const axios = require("axios");
const { createHttpTerminator } = require("http-terminator");
const integrationArgIndex = process.argv.indexOf("--integration");

dotenv.config();

let status = {
  integration_type: null,
  valid_internal_token: false,
};

// Set the integration type to public if the
// --integration flag is passed with the value public
if (integrationArgIndex > -1) {
  status.integration_type = process.argv[integrationArgIndex + 1];
  process.env.INTEGRATION_TYPE = status.integration_type;
}

// Runs all the configurations and test to make sure the server is ready to run.
(async () => {
  if (!process.env.NOTION_API_KEY) {
    console.log("No internal access token in .env file");
    process.exit(1);
  }

  // test the internal token by notion api users/me with axios
  const options = {
    method: "GET",
    url: "https://api.notion.com/v1/users/me",
    headers: {
      accept: "application/json",
      "Notion-Version": process.env.NOTION_API_VERSION,
      Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
    },
  };
  try {
    const response = await axios.request(options);
    const botTokenUser = response.data;
    const integrationType =
      botTokenUser.bot.owner.type === "user" ? "public" : "internal";
    console.log(
      `Running with ${integrationType} access token ${botTokenUser.id}`
    );
    status.valid_internal_token = true;
  } catch (error) {
    console.error(error);
    process.exit(1);
  }

  let ClientPool = null;
  // If the integration type is public,
  // then we need to connect to the database.
  if (process.env.INTEGRATION_TYPE === "public") {
    await db.config();
    ClientPool = ClientPoolFactory(db);
  } else {
    ClientPool = ClientPoolFactory();
  }
  // Injects the client pool into the services.
  UserService.configure(ClientPool);
  PageService.configure(ClientPool);
  ProjectsService.configure(ClientPool);
  TimeReportsService.configure(ClientPool);
  PeopleService.configure(ClientPool);
  LoginService.configure(ClientPool);
})();

const PORT = 3001;

const app = express();
app.use(bearerToken());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Don't load swagger if no swagger.json file present.
if (fs.existsSync(swaggerDocumentPath)) {
  const swaggerDocument = require(swaggerDocumentPath);
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}

app.use("/api", require("./routes/one_to_one_routes"));
app.use("/api", require("./routes/users_routes"));
app.use("/api", require("./routes/people_routes"));
app.use("/api", require("./routes/timereports_routes"));
app.use("/api", require("./routes/projects_routes"));
app.use("/api", require("./routes/login_routes"));
app.use("/api", require("./routes/test_routes"));

const server = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Running with ${status.integration_type} Notion integration`);
});

// Create a server terminator to gracefully shutdown the server. (Not used ATM)
const httpTerminator = createHttpTerminator({ server });

app.get("/api/status", (req, res) => {
  res.json({
    ...status,
    client_id: process.env.NOTION_OAUTH_CLIENT_ID,
  });
});

app.get("/api/clientId", (req, res) => {
  res.status(200).send(process.env.NOTION_OAUTH_CLIENT_ID);
});
