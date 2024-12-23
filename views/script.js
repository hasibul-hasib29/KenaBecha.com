// document.addEventListener("DOMContentLoaded", function () {
//     const signupButton = document.getElementById("signup");

//     if (signupButton) {
//         signupButton.addEventListener("click", function () {
//             // Update the URL using the History API
//             history.pushState(null, '', '/signup');

//             // Fetch the content for /signup
//             fetch("http://localhost:3000/signup")
//                 .then((response) => {
//                     if (!response.ok) {
//                         throw new Error(`HTTP error! status: ${response.status}`);
//                     }
//                     return response.text();
//                 })
//                 .then((data) => {
//                     // Inject the fetched HTML content into the body-section
//                     const bodySection = document.querySelector(".body-section");
//                     if (bodySection) {
//                         bodySection.innerHTML = data;
//                     }
//                 })
//                 .catch((error) =>
//                     console.error("Error loading signup content:", error)
//                 );
//         });
//     }

// });

// document.addEventListener("DOMContentLoaded", function () {
// document.getElementById("log-in").addEventListener("click", (res)=>{
//     console.log("login occured");
//     res.render('login');
// })});
document.getElementById("signup").addEventListener("click", function () {
    window.location.href = "/signup";
});

document.getElementById("log-in").addEventListener("click", function () {
    window.location.href = "/login";
});
document.getElementById("catalog").addEventListener("click", function () {
    window.location.href = "/catalog";
});
