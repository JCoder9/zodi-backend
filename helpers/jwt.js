const expressJwt = require('express-jwt');

function authJwt() {
    const secret = process.env.SECRET;
    const api = process.env.API_URL;
    return expressJwt({
        //checks for valid token
        secret,
        algorithms: ['HS256'],
        isRevoked: isRevoked,
    }).unless({
        //no token needed
        path: [
            {
                url: /\/public\/uploads(.*)/,
                methods: ['GET', 'OPTIONS'],
            },
            {
                url: /\/api\/v1\/products(.*)/,
                methods: ['GET', 'OPTIONS'],
            },
            {
                url: /\/api\/v1\/categories(.*)/,
                methods: ['GET', 'OPTIONS'],
            },
            {
                url: /\/api\/v1\/orders(.*)/,
                methods: ['GET', 'OPTIONS', 'POST'],
            },
            `${api}/users/login`,
            `${api}/users/register`,
        ],
    });
}

async function isRevoked(req, payload, done) {
    //payload is token details eg expiresIn, isAdmin
    if (!payload.isAdmin) {
        done(null, true); //reject token if not admin
    }

    done();
}

module.exports = authJwt;
