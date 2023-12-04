const express = require('express');
const router = express.Router();
const { User } = require('../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

router.get(`/`, async (req, res) => {
    const userList = await User.find().select('-passwordHash');

    if (!userList) {
        res.status(500).json({ success: false });
    }
    res.send(userList);
});

router.get(`/:id`, async (req, res) => {
    const user = await User.findById(req.params.id).select('-passwordHash');

    if (!user) {
        res.status(500).json({
            message: 'The user with the given id was not found!',
        });
    }
    res.status(200).send(user);
});

// get total User count
router.get(`/get/count`, (req, res) => {
    User.countDocuments()
        .then((count) => {
            if (count) {
                return res.status(200).json({ userCount: count });
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

router.post(`/`, async (req, res) => {
    let user = new User({
        name: req.body.name,
        email: req.body.email,
        passwordHash: bcrypt.hashSync(String(req.body.password), 10),
        phone: req.body.phone,
        isAdmin: req.body.isAdmin,
        street: req.body.street,
        appartment: req.body.appartment,
        zip: req.body.zip,
        city: req.body.city,
        country: req.body.country,
    });

    user = await user.save();

    if (!user) {
        return res.status(400).send('The user cannot be created!');
    }
    res.send(user);
});

router.post(`/register`, async (req, res) => {
    let user = new User({
        name: req.body.name,
        email: req.body.email,
        passwordHash: bcrypt.hashSync(String(req.body.password), 10),
        phone: req.body.phone,
        isAdmin: req.body.isAdmin,
        street: req.body.street,
        appartment: req.body.appartment,
        zip: req.body.zip,
        city: req.body.city,
        country: req.body.country,
    });

    user = await user.save();

    if (!user) {
        return res.status(400).send('The user cannot be created!');
    }
    res.send(user);
});

router.post('/login', async (req, res) => {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
        return res.status(400).send('The user not found!');
    }
    let comparison = bcrypt.compareSync(
        String(req.body.password),
        String(user.passwordHash)
    );

    if (user && comparison) {
        const token = jwt.sign(
            {
                userId: user.id,
                isAdmin: user.isAdmin,
            },
            process.env.SECRET,
            {
                expiresIn: '1d',
            }
        );
        res.status(200).send({ user: user.email, token: token });
    } else {
        res.status(400).send('Password incorrect!');
    }
});

router.put(`/:id`, async (req, res) => {
    const userExist = await User.findById(req.params.id);
    let newPassword;
    if (req.body.password) {
        newPassword = bcrypt.hashSync(String(req.body.password), 10);
    } else {
        newPassword = userExist.passwordHash;
    }
    const user = await User.findByIdAndUpdate(
        req.params.id,
        {
            name: req.body.name,
            email: req.body.email,
            passwordHash: newPassword,
            phone: req.body.phone,
            isAdmin: req.body.isAdmin,
            street: req.body.street,
            appartment: req.body.appartment,
            zip: req.body.zip,
            city: req.body.city,
            country: req.body.country,
        },
        { new: true }
    );

    if (!user) {
        return res.status(400).send('The user cannot be updated!');
    }
    res.send(user);
});

router.delete(`/:id`, (req, res) => {
    User.findByIdAndRemove(req.params.id)
        .then((user) => {
            if (user) {
                return res
                    .status(200)
                    .json({ success: true, message: 'The user is deleted!' });
            } else {
                return res
                    .status(404)
                    .json({ success: false, message: 'User not found!' });
            }
        })
        .catch((err) => {
            //for errors to do with connection whereas above was to do with existence of user
            return res.status(400).json({ success: false, error: err });
        });
});

module.exports = router;
