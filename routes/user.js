const express = require("express");
const {getUser} = require("../service/auth")

const { handleEditProfile,handleUserSignup, handleUserLogin , handleProductUpload , connection , handleUserHistory , updateProductStatus , handleCatalog , handleSearch } = require("../controllers/user");
const { checkAuth } = require("../middlewares/auth");
const multer = require("multer");
const router = express.Router();
const fs = require("fs");

// Public routes
router.get('/editprofile',checkAuth, (req, res)=>{
  return res.render("editprofile" , {user : req.user});
});

router.post("/editprofile", checkAuth, handleEditProfile);
router.post("/signup", handleUserSignup);
router.post("/login", handleUserLogin);
router.get("/home" , (req, res) =>{
  const userUid = req.cookies?.uid;

  if (userUid) {
    // Redirect to login if no token is present
    const user = getUser(userUid);
    return res.render("home" , {user});
  }
  else {
    return res.render("home" , {user: null})
  }


  // return res.render("home" , {user : req.user || null});
});
router.get("/" , (req, res) =>{
  const userUid = req.cookies?.uid;

  if (userUid) {
    // Redirect to login if no token is present
    const user = getUser(userUid);
    return res.render("home" , {user});
  }
  else {
    return res.render("home" , {user: null})
  }
});
// Protected route
// router.get("/catalog", checkAuth, (req, res) => {
//   console.log(req.user);
//   return res.render("catalog", { user: req.user } );
// });

router.get("/catalog", checkAuth, handleCatalog);

router.get('/profile', checkAuth , (req,res)=>{
  return res.render("profile" , {user: req.user});
})

router.get("/signout", (req, res) => {
  res.clearCookie("uid"); // Clear the authentication cookie
  return res.redirect("/home"); // Redirect to the login page
});

router.get("/uploaditem", checkAuth, (req, res) => {
  return res.render("uploaditem", { user: req.user }); // Pass the user object
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = `./uploads/${Date.now()}-${req.user.email_address}/`;

    // Create the directory if it doesn't exist
    fs.mkdirSync(uploadPath, { recursive: true });

    return cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    return cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });


router.post(
  "/uploaditem",
  checkAuth,
  upload.fields([
    { name: "productCoverPhoto", maxCount: 1 },
    { name: "productPictures", maxCount: 50 },
  ]),
  handleProductUpload
);

router.get("/uploadhistory" , checkAuth , handleUserHistory);
router.get("/update-status/:productId",checkAuth ,updateProductStatus);
router.get("/search" , checkAuth , handleSearch  )
module.exports = router;
