const jwt = require("jsonwebtoken");

const secret = process.env.SECRET_KEY;

function setUser(user) {
  return jwt.sign(
    {
      name: user.name,
      email_address: user.email_address,
      mobile_number: user.mobile_number,
    },
    secret,
    { expiresIn: "1h" }
  );
}

function getUser(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, secret);
  } catch (err) {
    return null;
  }
}

module.exports = { setUser, getUser };
