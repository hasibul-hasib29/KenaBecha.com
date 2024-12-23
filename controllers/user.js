const mysql = require("mysql2");
const { setUser, getUser } = require("../service/auth");
const bcrypt = require("bcrypt");
const { checkAuth } = require("../middlewares/auth");

const userRoute = require("../routes/user");
// Create a MySQL connection
const connection = mysql
  .createConnection({
    host: process.env.HOST_NAME,
    user: process.env.HOST_USER,
    password: process.env.HOST_PASSWORD,
    database: process.env.DATABASE_NAME,
    port: process.env.DATABASE_PORT || 3306,
  })
  .promise();

// Check the connection to ensure it's working
connection.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err.stack);
    return;
  }
  console.log("Connected to the database.");
});

// user signup

async function handleUserSignup(req, res) {
  const { name, mobile_number, email_address, password } = req.body;

  // Validate inputs
  if (!name || !email_address || !mobile_number || !password) {
    return res.render("signup", {
      alertMessage: "All fields are required. Please fill out the form completely.",
    });
  }

  try {
    
    const [existingUser] = await connection.query(
      `SELECT * FROM users WHERE email_address = ?`,
      [email_address]
    );

    if (existingUser.length > 0) {
      return res.render("signup", {
        alertMessage: "This email is already registered. Please use a different email.",
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 13); 

    // Insert new user
    await connection.query(
      `INSERT INTO users (name, email_address, mobile_number, password)
       VALUES (?, ?, ?, ?)`,
      [name, email_address, mobile_number, hashedPassword]
    );

    // Create user token and set cookie
    const user = { name, email_address, mobile_number };
    const token = setUser(user);
    res.cookie("uid", token, { httpOnly: true, secure: true });

    // Redirect to catalog
    return res.redirect("/catalog");
  } catch (error) {
    console.error("Error during signup:", error);
    return res.status(500).render("signup", {
      alertMessage: "An unexpected error occurred. Please try again later.",
    });
  }
}

// Update the visit history with the current time
// async function updateVisitHistory(shortId) {
//   const currentTime = new Date().toISOString().slice(0, 19).replace("T", " ");
//   const newEntry = { time: currentTime }; // Create an object with the current time

//   const sql = `
//     UPDATE urls
//     SET visitHistory = JSON_ARRAY_APPEND(visitHistory, '$', CAST(? AS JSON))
//     WHERE shortId = ?`;

//   try {
//     const [result] = await connection.query(sql, [
//       JSON.stringify(newEntry),
//       shortId,
//     ]);

//     if (result.affectedRows === 0) {
//       console.log("Short ID not found");
//       return { message: "Short ID not found" };
//     }

//     console.log("Visit history updated successfully");
//     return { message: "Visit history updated successfully" };
//   } catch (err) {
//     console.error("Error updating visit history:", err);
//     throw new Error("Failed to update visit history");
//   }
// }

async function handleUserLogin(req, res) {
  const { email, password } = req.body;
  console.log({ email, password });

  try {
    const [rows] = await connection.query(
      `SELECT name, email_address, mobile_number, password FROM users WHERE email_address = ?`,
      [email]
    );

    // Handle case where no user is found
    if (rows.length === 0) {
      return res.render("login", {
        alertMessage: "Invalid Username or Password",
      });
    }

    const user = rows[0];

    // Compare the hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.render("login", {
        alertMessage: "Invalid Username or Password",
      });
    }

    // Generate token
    const token = setUser(user);
    console.log("Generated token:", token);

    // Set cookie and render user dashboard
    res.cookie("uid", token, { httpOnly: true, secure: true });
    return res.redirect("/catalog");
  } catch (error) {
    console.error("Error during login:", error);
    return res.status(500).render("login", {
      error: "An unexpected error occurred. Please try again later.",
    });
  }
}


async function handleProductUpload(req, res) {
  const coverPhoto = req.files["productCoverPhoto"];
  const additionalPhotos = req.files["productPictures"];
  const {
    productName,
    
    productDescription,
    contactNumber,
    productLocation,
    productPrice,
  } = req.body;

  const email_address = req.user.email_address;

  console.log("Uploaded files:", req.files);
  console.log("Form data:", req.body);

  // Validation: Ensure cover photo is present
  if (!coverPhoto || coverPhoto.length === 0) {
    return res.render("uploaditem", {
      user: req.user,
      alertMessage: "Cover photo is required.",
    });
  }

  // Validation: Ensure valid product price
  if (!productPrice || isNaN(productPrice) || productPrice <= 0) {
    return res.render("uploaditem", {
      user: req.user,
      alertMessage: "Valid product price is required.",
    });
  }

  // Validation: Ensure valid contact number
  if (!contactNumber || isNaN(contactNumber)) {
    return res.render("uploaditem", {
      user: req.user,
      alertMessage: "Valid product phone number is required.",
    });
  }

  try {
    // Insert new product into the database
    const sqlInsertProduct = `
            INSERT INTO products (name,email_address, description, price, location, contact_number, created_at)
            VALUES (?, ? , ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `;
    const [productResult] = await connection.query(sqlInsertProduct, [
      productName,
      email_address,
      productDescription,
      productPrice,
      productLocation,
      contactNumber,
    ]);
    const productId = productResult.insertId;

    // Insert cover photo
    const coverPhotoRecord = [
      coverPhoto[0].filename,
      coverPhoto[0].path,
      true, // is_cover = true
      productId,
    ];

    const sqlInsertCoverPhoto = `
            INSERT INTO uploaded_files (filename, filepath, is_cover, product_id)
            VALUES (?, ?, ?, ?)
        `;
    await connection.query(sqlInsertCoverPhoto, coverPhotoRecord);

    // Insert additional photos
    const additionalPhotoRecords = additionalPhotos.map((photo) => [
      photo.filename,
      photo.path,
      false, // is_cover = false
      productId,
    ]);

    const sqlInsertAdditionalPhotos = `
            INSERT INTO uploaded_files (filename, filepath, is_cover, product_id)
            VALUES ?
        `;
    await connection.query(sqlInsertAdditionalPhotos, [additionalPhotoRecords]);

    console.log("Files metadata saved to the database");
    const sqlInsertProductStatus = `
        INSERT INTO product_status (product_id, status) 
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE status = ?
    `;

    await connection.query(sqlInsertProductStatus, [productId, true, true]); // Default status as true (available)

    console.log("Files metadata and product status saved to the database");

    // res.send("Product uploaded successfully!");
    return res.redirect("/catalog");
  } catch (error) {
    console.error("Error uploading product:", error);
    res.status(500).send("An error occurred while uploading the product.");
  }
}

async function handleUserHistory(req, res) {
  const sql = `
    SELECT 
        subquery.product_id AS product_id,
        subquery.product_name AS product_name,
        subquery.product_description AS product_description,
        subquery.product_price AS product_price,
        subquery.product_location AS product_location,
        subquery.contact_number AS contact_number,
        subquery.created_at AS created_at,
        subquery.cover_photo AS cover_photo,
        subquery.other_photos AS other_photos,
        ps.status AS product_status
    FROM (
        SELECT 
            p.id AS product_id,
            p.name AS product_name,
            p.description AS product_description,
            p.price AS product_price,
            p.location AS product_location,
            p.contact_number AS contact_number,
            p.created_at,
            GROUP_CONCAT(CASE WHEN uf.is_cover THEN uf.filepath END) AS cover_photo,
            GROUP_CONCAT(CASE WHEN NOT uf.is_cover THEN uf.filepath END) AS other_photos
        FROM products p
        LEFT JOIN uploaded_files uf ON p.id = uf.product_id
        WHERE p.email_address = ?
        GROUP BY p.id
    ) subquery
    LEFT JOIN product_status ps ON subquery.product_id = ps.product_id
  `;

  try {
    // Query the database using the authenticated user's email address
    const [files] = await connection.query(sql, [req.user.email_address]);

    // Format the result for consistent structure
    const formattedFiles = files.map(file => ({
      product_id: file.product_id,
      product_name: file.product_name || "No name available",
      description: file.product_description || "No description available",
      price: file.product_price || "N/A",
      location: file.product_location || "N/A",
      contact_number: file.contact_number || "N/A",
      created_at: new Date(file.created_at).toLocaleString(), // Format date for display
      cover_photo: file.cover_photo || null, // Fallback for cover photo
      other_photos: file.other_photos ? file.other_photos.split(',') : [], // Split other photos into an array
      status: file.product_status  // Interpret product status
    }));

    console.log("Formatted files for user history: ", formattedFiles);

    // Render the upload history page with formatted data
    res.render("uploadhistory", { user: req.user, files: formattedFiles });
  } catch (error) {
    console.error("Error fetching user history: ", error);

    // Send a generic error response in case of failure
    res.status(500).send("An error occurred while fetching user history.");
  }
}


async function updateProductStatus(req, res) {
  const productId = req.params.productId; // Extract product ID from the route
  const currentStatus = parseInt(req.query.currentStatus, 10); // Convert to integer (0 or 1)

  // Toggle the status: if currentStatus is 1 (Available), make it 0 (Sold), and vice versa
  const newStatus = currentStatus === 1 ? 0 : 1;

  const sql = `
      UPDATE product_status
      SET status = ?
      WHERE product_id = ?;
  `;

  try {
      await connection.query(sql, [newStatus, productId]);
      res.redirect("/uploadhistory"); // Redirect back to the upload history page
  } catch (error) {
      console.error("Error updating product status: ", error);
      res.status(500).send("Failed to update product status.");
  }
}


async function handleCatalog(req, res) {
  console.log("Authenticated user: ", req.user);
  const sql = `
SELECT 
    subquery.product_id  AS product_id,
    subquery.product_name AS product_name,
    subquery.product_description AS product_description,
    subquery.product_price AS product_price,
    subquery.product_location  AS product_location,
    subquery.contact_number AS contact_number,
    subquery.created_at as created_at,
    subquery.cover_photo as cover_photo ,
    subquery.other_photos as other_photos,
    ps.status AS product_status
FROM (
    SELECT 
        p.id AS product_id,
        p.name AS product_name,
        p.description AS product_description,
        p.price AS product_price,
        p.location AS product_location,
        p.contact_number AS contact_number,
        p.created_at,
        GROUP_CONCAT(CASE WHEN uf.is_cover THEN uf.filepath END) AS cover_photo,
        GROUP_CONCAT(CASE WHEN NOT uf.is_cover THEN uf.filepath END) AS other_photos
    FROM products p
    LEFT JOIN uploaded_files uf ON p.id = uf.product_id
    GROUP BY p.id
) subquery
LEFT JOIN product_status ps ON subquery.product_id = ps.product_id;

  `;

  try {
      const [files] = await connection.query(sql);

      const formattedFiles = files.map(file => ({
          product_id: file.product_id,
          product_name: file.product_name || "No name available",
          description: file.product_description || "No description available",
          price: file.product_price || "N/A",
          location: file.product_location || "N/A",
          contact_number: file.contact_number || "N/A",
          created_at: new Date(file.created_at).toLocaleString(),
          cover_photo: file.cover_photo,
          other_photos: file.other_photos ? file.other_photos.split(',') : [],
          status: file.product_status 
      }));
      console.log("Formatted files: ", formattedFiles);

      res.render("catalog", { user: req.user, files: formattedFiles });
  } catch (error) {
      console.error("Error fetching files: ", error);
      res.status(500).send("An error occurred while fetching files.");
  }
}


async function handleSearch(req, res) {
  const searchQuery = req.query.query; // Extract the search query (e.g., ?query=laptop)
  console.log("Search query: ", searchQuery);

  // SQL query to fetch matching products
  const sql = `
    SELECT 
        subquery.product_id AS product_id,
        subquery.product_name AS product_name,
        subquery.product_description AS product_description,
        subquery.product_price AS product_price,
        subquery.product_location AS product_location,
        subquery.contact_number AS contact_number,
        subquery.created_at AS created_at,
        subquery.cover_photo AS cover_photo,
        subquery.other_photos AS other_photos,
        ps.status AS product_status
    FROM (
        SELECT 
            p.id AS product_id,
            p.name AS product_name,
            p.description AS product_description,
            p.price AS product_price,
            p.location AS product_location,
            p.contact_number AS contact_number,
            p.created_at,
            GROUP_CONCAT(CASE WHEN uf.is_cover THEN uf.filepath END) AS cover_photo,
            GROUP_CONCAT(CASE WHEN NOT uf.is_cover THEN uf.filepath END) AS other_photos
        FROM products p
        LEFT JOIN uploaded_files uf ON p.id = uf.product_id
        WHERE p.name LIKE ?  -- Use LIKE for partial matches
        GROUP BY p.id
    ) subquery
    LEFT JOIN product_status ps ON subquery.product_id = ps.product_id
  `;

  try {
    // Execute the query with wildcard search
    const [files] = await connection.query(sql, [`%${searchQuery}%`]);

    // Check if any results are found
    if (files.length === 0) {
      return res.render("catalog", { 
        user: req.user, 
        files: [], 
        alertMessage: `No results found for "${searchQuery}".` 
      });
    }

    // Format the result for consistent structure
    const formattedFiles = files.map(file => ({
      product_id: file.product_id,
      product_name: file.product_name || "No name available",
      description: file.product_description || "No description available",
      price: file.product_price || "N/A",
      location: file.product_location || "N/A",
      contact_number: file.contact_number || "N/A",
      created_at: new Date(file.created_at).toLocaleString(),
      cover_photo: file.cover_photo || null,
      other_photos: file.other_photos ? file.other_photos.split(',') : [],
      status: file.product_status
    }));

    console.log("Search results: ", formattedFiles);

    // Render the catalog with search results
    res.render("catalog", { 
      user: req.user, 
      files: formattedFiles , 
      alertMessage: `Search result for "${searchQuery}".`
    });
  } catch (error) {
    console.error("Error during search: ", error);

    // Handle errors
    res.status(500).send("An error occurred while processing your search.");
  }
}





async function handleEditProfile(req, res) {
  const { name, mobile_number, old_password, new_password } = req.body;
  const userEmail = req.user.email_address;

  try {
    // Fetch the user's existing password from the database
    const [user] = await connection.query(
      "SELECT password FROM users WHERE email_address = ?",
      [userEmail]
    );

    if (user.length === 0) {
      return res.status(404).render("editprofile", {
        user: req.user,
        alertMessage: "User not found.",
      });
    }

    // Validate the old password
    const isOldPasswordValid = await bcrypt.compare(old_password, user[0].password);
    if (!isOldPasswordValid) {
      return res.render("profile", {
        user: req.user,
        alertMessage: "Old password does not match. Please try again.",
      });
    }

    // Hash the new password
    const hashedNewPassword = await bcrypt.hash(new_password, 13);

    // Update user profile
    await connection.query(
      "UPDATE users SET name = ?, mobile_number = ?, password = ? WHERE email_address = ?",
      [name, mobile_number, hashedNewPassword, userEmail]
    );

    res.render("login", { alertMessage: "Profile Updated Successfully! Login Again.." });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).render("editprofile", {
      user: req.user,
      alertMessage: "An error occurred while updating your profile. Please try again later.",
    });
  }
}











module.exports = {
  connection,
  handleUserSignup,
  handleUserLogin,
  handleProductUpload,
  handleUserHistory, 
  updateProductStatus,
  handleCatalog, 
  handleSearch,
  handleEditProfile
};

// module.exports = { connection, handleUserSignup , handleUserLogin};
