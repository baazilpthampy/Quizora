import dotenv from 'dotenv';
import { app } from './app';

// Load environment variables
dotenv.config();

const port = process.env.PORT || 3001;

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
