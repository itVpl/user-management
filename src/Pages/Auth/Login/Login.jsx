import React, { useEffect, useState } from 'react';
import logo from '../../../assets/LogoFinal.png';
import VideoBg from '../../../assets/BackgroundVideo.mp4';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Login({ setIsAuthenticated }) {
  const [empId, setEmpId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post(
        "https://vpl-liveproject-1.onrender.com/api/v1/inhouseUser/login",
        { empId, password },
        { withCredentials: true }
      );

      if (res.data.success) {
        setSuccess(true);
        setIsAuthenticated(true);

        const user = res.data.employee;
        const token = res.data.token;

        // ✅ Always save token and empId (required for bid)
        if (rememberMe) {
          localStorage.setItem("token", token);
          localStorage.setItem("empId", user.empId);
          localStorage.setItem("user", JSON.stringify(user));
          localStorage.setItem("authToken", token); // optional
        } else {
          sessionStorage.setItem("token", token);
          sessionStorage.setItem("empId", user.empId);
          sessionStorage.setItem("user", JSON.stringify(user));
          sessionStorage.setItem("authToken", token); // optional
        }

        navigate("/dashboard");
      } else {
        setSuccess(false);
        setErrorMessage("Login failed. Please check your credentials.");
      }
    } catch (err) {
      setSuccess(false);
      setErrorMessage(err.response?.data?.message || "Something went wrong");
      console.log("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  return (
    <div className="relative flex justify-center items-center min-h-screen px-4 overflow-hidden">
      {success === true && (
        <p className="absolute top-6 left-6 bg-green-600 text-white px-4 py-2 rounded shadow-md z-50">
          Login Successful
        </p>
      )}

      {errorMessage && (
        <div className="absolute top-6 right-6 bg-red-700 text-white px-5 py-2 rounded-md shadow-md z-50 animate-fade-in">
          {errorMessage}
        </div>
      )}

      <div className="absolute top-0 left-0 w-full h-full z-0 overflow-hidden">
        <video
          className="w-full h-full object-cover"
          src={VideoBg}
          autoPlay
          loop
          muted
          playsInline
        />
        <div className="absolute inset-0 backdrop-blur-sm bg-black/20" />
      </div>

      <div className="relative z-20 w-full max-w-md p-14 bg-white/90 backdrop-blur-md rounded-xl shadow-lg">
        <form method="post" className="space-y-5" onSubmit={handleLogin}>
          <div className="flex justify-center mb-4">
            <img src={logo} alt="Company Logo" className="h-16 object-contain" />
          </div>

          <input
            type="text"
            placeholder="Employee ID"
            value={empId}
            onChange={(e) => setEmpId(e.target.value)}
            className="w-full py-2 border-b border-gray-400 bg-transparent focus:outline-none focus:border-black"
          />

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              placeholder="Password"
              onChange={(e) => setPassword(e.target.value)}
              className="w-full py-2 border-b border-gray-400 bg-transparent focus:outline-none focus:border-black pr-10"
            />
            <span
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-2 cursor-pointer text-gray-600"
              title={showPassword ? "Hide Password" : "Show Password"}
            >
              {showPassword ? '🙈' : '👁️'}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="accent-blue-500"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Keep me signed in
            </label>
            <a href="#" className="text-blue-500 hover:underline">Forgot Password?</a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full flex justify-center items-center gap-2 bg-blue-500 text-white py-2 rounded-md transition cursor-pointer ${
              loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-600'
            }`}
          >
            {loading && (
              <div className="w-10 h-10 border-b-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            )}
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;


// import React, { useEffect, useState } from 'react';
// import logo from '../../../assets/LogoFinal.png';
// import VideoBg from '../../../assets/BackgroundVideo.mp4';
// import axios from 'axios';
// import { useNavigate } from 'react-router-dom';

// function Login({ setIsAuthenticated }) {
//   const [empId, setEmpId] = useState('');
//   const [password, setPassword] = useState('');
//   const [showPassword, setShowPassword] = useState(false); // 👈 New state
//   const [success, setSuccess] = useState(null);
//   const [errorMessage, setErrorMessage] = useState('');
//   const [rememberMe, setRememberMe] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const navigate = useNavigate();

//   const handleLogin = async (e) => {
//     e.preventDefault();
//       setLoading(true);
//     try {
//       const res = await axios.post(
//         "https://vpl-liveproject-1.onrender.com/api/v1/inhouseUser/login",
//         { empId, password },
//         { withCredentials: true }
//       );

//       if (res.data.success) {
//         setSuccess(true);
//         setIsAuthenticated(true);

//         const user = res.data.employee;
//         const token = res.data.token;

//         if (rememberMe) {
//           localStorage.setItem("user", JSON.stringify(user));
//           localStorage.setItem("authToken", token);
//         } else {
//           sessionStorage.setItem("user", JSON.stringify(user));
//           sessionStorage.setItem("authToken", token);
//         }

//         navigate("/dashboard");
//       } else {
//         setSuccess(false);
//         setErrorMessage("Login failed. Please check your credentials.");
//       }
//     } catch (err) {
//       setSuccess(false);
//       setErrorMessage(err.response?.data?.message || "Something went wrong");
//       console.log("Login error:", err);
//     }
//     finally {
//     setLoading(false); // always stop loader
//   }
//   };

//   useEffect(() => {
//     if (errorMessage) {
//       const timer = setTimeout(() => setErrorMessage(''), 3000);
//       return () => clearTimeout(timer);
//     }
//   }, [errorMessage]);

//   return (
//     <div className="relative flex justify-center items-center min-h-screen px-4 overflow-hidden">
//       {success === true && (
//         <p className="absolute top-6 left-6 bg-green-600 text-white px-4 py-2 rounded shadow-md z-50">
//           Login Successful
//         </p>
//       )}

//       {errorMessage && (
//         <div className="absolute top-6 right-6 bg-red-700 text-white px-5 py-2 rounded-md shadow-md z-50 animate-fade-in">
//           {errorMessage}
//         </div>
//       )}

//       <div className="absolute top-0 left-0 w-full h-full z-0 overflow-hidden">
//         <video
//           className="w-full h-full object-cover"
//           src={VideoBg}
//           autoPlay
//           loop
//           muted
//           playsInline
//         />
//         <div className="absolute inset-0 backdrop-blur-sm bg-black/20" />
//       </div>

//       <div className="relative z-20 w-full max-w-md p-14 bg-white/90 backdrop-blur-md rounded-xl shadow-lg">
//         <form method="post" className="space-y-5" onSubmit={handleLogin}>
//           <div className="flex justify-center mb-4">
//             <img src={logo} alt="Company Logo" className="h-16 object-contain" />
//           </div>

//           <input
//             type="text"
//             placeholder="Employee ID"
//             value={empId}
//             onChange={(e) => setEmpId(e.target.value)}
//             className="w-full py-2 border-b border-gray-400 bg-transparent focus:outline-none focus:border-black"
//           />

//           <div className="relative">
//             <input
//               type={showPassword ? 'text' : 'password'}
//               value={password}
//               placeholder="Password"
//               onChange={(e) => setPassword(e.target.value)}
//               className="w-full py-2 border-b border-gray-400 bg-transparent focus:outline-none focus:border-black pr-10"
//             />
//             <span
//               onClick={() => setShowPassword(!showPassword)}
//               className="absolute right-2 top-2 cursor-pointer text-gray-600"
//               title={showPassword ? "Hide Password" : "Show Password"}
//             >
//               {showPassword ? '🙈' : '👁️'}
//             </span>
//           </div>

//           <div className="flex items-center justify-between text-sm">
//             <label className="flex items-center gap-2">
//               <input
//                 type="checkbox"
//                 className="accent-blue-500"
//                 checked={rememberMe}
//                 onChange={(e) => setRememberMe(e.target.checked)}
//               />
//               Keep me signed in
//             </label>
//             <a href="#" className="text-blue-500 hover:underline">Forgot Password?</a>
//           </div>

//           {/* <button
//             type="submit"
//             className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition cursor-pointer"
//           >
//             Log In
//           </button> */}
//           <button
//   type="submit"
//   disabled={loading}
//   className={`w-full flex justify-center items-center gap-2 bg-blue-500 text-white py-2 rounded-md transition cursor-pointer ${
//     loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-600'
//   }`}
// >
//   {loading && (
//     <div className="w-10 h-10 border-b-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
//   )}
//   {loading ? 'Logging in...' : 'Log In'}
// </button>
//         </form>
//       </div>
//     </div>
//   );
// }

// export default Login;
