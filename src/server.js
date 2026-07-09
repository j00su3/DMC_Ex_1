require('dotenv').config();
const path = require('path');
const express = require('express');
const tasksRouter = require('./routes/tasks');
const categoriesRouter = require('./routes/categories');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/api/tasks', tasksRouter);
app.use('/api/categories', categoriesRouter);

app.listen(PORT, () => {
  console.log(`DMC Ex 1 - Todo app running at http://localhost:${PORT}`);
});
