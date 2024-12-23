const { getUser } = require("../service/auth");

async function checkAuth(req, res, next) {
  const userUid = req.cookies?.uid;

  if (!userUid) {
    // Redirect to login if no token is present
    return res.render("login" , {alertMessage: "Please Log in... ⛔",});
  }

  const user = getUser(userUid);

  if (!user) {
    // Redirect to login if token is invalid
    return res.render("login" , {alertMessage: "Please Log in... ⛔",});
  }

  req.user = user; // Attach user to request object
  next(); // Continue to the next middleware or route handler
}

module.exports = { checkAuth };
