import { config } from "./config";
import app from "./app";

app.listen(config.port, () => {
  console.log(`Sunharvest API running on port ${config.port}`);
});

export default app;
