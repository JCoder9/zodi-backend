const express = require('express');
const app = express();
const morgan = require('morgan');
const mongoose = require('mongoose');
const cors = require('cors');
const authJwt = require('./helpers/jwt');
const errorHandler = require('./helpers/error-handler');

require('dotenv/config');

app.use(cors());
app.options('*', cors());

//middleware
app.use(express.json());
app.use(morgan('tiny'));
app.use(authJwt()); //checks each api request to see if token sent with request is valid
app.use(errorHandler);
app.use('/public/uploads', express.static(__dirname + '/public/uploads'));

//routers
const productsRoutes = require('./routes/products');
const categoriesRoutes = require('./routes/categories');
const usersRoutes = require('./routes/users');
const ordersRoutes = require('./routes/orders');

const api = process.env.API_URL;

app.use(`${api}/products`, productsRoutes);
app.use(`${api}/categories`, categoriesRoutes);
app.use(`${api}/users`, usersRoutes);
app.use(`${api}/orders`, ordersRoutes);

//Database
mongoose.connect(process.env.MONGO_CONNECTION_STRING)
.then(() => {
    console.log('Database connection is ready...');
})
.catch((err) => {
    console.log(err);
})

//Server
app.listen(3000, () => {
    console.log('server is running http://localhost:3000');
})