const express = require('express');
const router = express.Router();
const { Order } = require('../models/order');
const { OrderItem } = require('../models/order-item');
const { Product } = require('../models/product');
const stripe = require('stripe')(
    'sk_test_51LNGHcCT1CiSMWZ7mAlnlM63FbV1YFNexLXQO6oHU0ujNA0CAcf7Dav6ayoJIc5CxSGlAicelVIUzWU73LuWAoJY00aIlk1oWq'
);

router.get(`/`, async (req, res) => {
    const orderList = await Order.find()
        .populate('user', 'name')
        .populate({
            path: 'orderItems',
            populate: {
                path: 'product',
                populate: 'category',
            },
        })
        .sort({ dateOrdered: -1 });

    if (!orderList) {
        res.status(500).json({ success: false });
    }
    res.send(orderList);
});

router.get(`/:id`, async (req, res) => {
    const order = await Order.findById(req.params.id)
        .populate('user', 'name')
        .populate({
            path: 'orderItems',
            populate: {
                path: 'product',
                populate: 'category',
            },
        });

    if (!order) {
        res.status(500).json({ success: false });
    }
    res.send(order);
});

// get total order count
router.get(`/get/count`, (req, res) => {
    Order.countDocuments()
        .then((count) => {
            if (count) {
                return res.status(200).json({ orderCount: count });
            } else {
                return res.status(500).json({ success: false });
            }
        })
        .catch((err) => {
            return res.status(400).json({
                success: false,
                error: err,
            });
        });
});

router.get(`/get/userorders/:userid`, async (req, res) => {
    const userOrderList = await Order.find({ user: req.params.userid })
        .populate({
            path: 'orderItems',
            populate: {
                path: 'product',
                populate: 'category',
            },
        })
        .sort({ dateOrdered: -1 });

    if (!userOrderList) {
        res.status(500).json({ success: false });
    }
    res.send(userOrderList);
});

router.post(`/`, async (req, res) => {
    //Promise.all makes sure all promises/awaits are resolved before creating order below
    const orderItemsIds = Promise.all(
        req.body.orderItems.map(async (orderItem) => {
            let newOrderItem = new OrderItem({
                quantity: orderItem.quantity,
                product: orderItem.product,
            });

            newOrderItem = await newOrderItem.save();

            return newOrderItem._id;
        })
    );

    const orderItemsIdsResolved = await orderItemsIds;

    const totalPrices = await Promise.all(
        orderItemsIdsResolved.map(async (orderItemsId) => {
            const orderItem = await OrderItem.findById(orderItemsId).populate(
                'product',
                'price'
            );
            const totalPrice = orderItem.product.price * orderItem.quantity;
            return totalPrice;
        })
    );

    const totalPrice = totalPrices.reduce((a, b) => a + b, 0);

    let order = new Order({
        orderItems: orderItemsIdsResolved,
        shippingAddress1: req.body.shippingAddress1,
        shippingAddress2: req.body.shippingAddress2,
        city: req.body.city,
        zip: req.body.zip,
        country: req.body.country,
        phone: req.body.phone,
        status: req.body.status,
        totalPrice: totalPrice,
        user: req.body.user,
    });

    order = await order.save();

    if (!order) {
        return res.status(400).send('The order cannot be created!');
    }
    res.send(order);
});

router.post('/create-checkout-session', async (req, res) => {
    const orderItems = req.body;

    if (!orderItems) {
        return res
            .status(400)
            .send('Checkout session cannot be created - check the order items');
    }
    const lineItems = await Promise.all(
        orderItems.map(async (orderItem) => {
            const product = await Product.findById(orderItem.product);
            return {
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: product.name,
                    },
                    unit_amount: product.price * 100,
                },
                quantity: orderItem.quantity,
            };
        })
    );
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: 'http://localhost:4200/success',
        cancel_url: 'http://localhost:4200/error',
    });

    res.json({ id: session.id });
});

router.put(`/:id`, async (req, res) => {
    const order = await Order.findByIdAndUpdate(
        req.params.id,
        {
            status: req.body.status,
        },
        { new: true }
    );

    if (!order) {
        return res.status(400).send('The order cannot be updated!');
    }
    res.send(order);
});

router.delete(`/:id`, (req, res) => {
    Order.findByIdAndRemove(req.params.id)
        .then(async (order) => {
            if (order) {
                await order.orderItems.map(async (orderItem) => {
                    await OrderItem.findByIdAndRemove(orderItem); //each orderItem is just an id
                });
                return res
                    .status(200)
                    .json({ success: true, message: 'The order is deleted!' });
            } else {
                return res
                    .status(404)
                    .json({ success: false, message: 'Order not found!' });
            }
        })
        .catch((err) => {
            //for errors to do with connection whereas above was to do with existence of order
            return res.status(400).json({ success: false, error: err });
        });
});

router.get('/get/totalsales', async (req, res) => {
    const totalSales = await Order.aggregate([
        { $group: { _id: null, totalsales: { $sum: '$totalPrice' } } },
    ]);

    if (!totalSales) {
        return res.status(400).send('The order sales cannot be generated!');
    }

    res.send({ totalsales: totalSales.pop().totalsales });
});

module.exports = router;
