import app from "./app";
import config from "./config/config";

app.listen(config.port, function (err) {
  if (err) {
    console.log("Error while starting server");
  } else {
    console.log("Server has been started at " + config.port);
  }
});
