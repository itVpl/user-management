import React, { useEffect, useState } from 'react';
import logo from '../../../assets/LogoFinal.png';
import VideoBg from '../../../assets/BackgroundVideo.mp4';

function Signup() {
    const [userType, setUserType] = useState('Shipper');
    const [errorMessage,setErrorMessage]=useState('')

    useEffect(()=>{
        if(errorMessage){
            const timer = setTimeout(()=>{setErrorMessage('')},3000);
            return ()=> clearTimeout(timer)
        }
    },[errorMessage])

    return (
        <div className="relative h-screen w-full overflow-hidden">
            {/* Background */}
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
            <div className="absolute top-0 left-0 w-full h-full bg-black/30 z-10" />

            {/* Form */}
            <div className="relative z-20 flex justify-center items-center h-full px-4">
                <div className="w-full max-w-xl p-8 bg-[#fff] rounded-xl shadow-lg">
                    {/* Logo */}
                    <div className="flex justify-center mb-4">
                        <img src={logo} alt="V Power Logo" className="h-12" />
                    </div>

                    {/* Toggle Buttons */}
                    <div className="flex justify-center mb-6 border border-gray-300 rounded-md overflow-hidden">
                        <button
                            onClick={() => setUserType('Shipper')}
                            className={`w-1/2 py-2 font-medium ${userType === 'Shipper'
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-transparent text-black'
                                }`}
                        >
                            Shipper
                        </button>
                        <button
                            onClick={() => setUserType('Trucker')}
                            className={`w-1/2 py-2 font-medium ${userType === 'Trucker'
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-transparent text-black'
                                }`}
                        >
                            Trucker
                        </button>
                    </div>

                    {/* Form Fields */}
<form className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {/* MC/DOT Number & Fleet Size (conditionally disabled) */}
  <input
    type="text"
    placeholder="MC/DOT Number"
    disabled={userType === 'Shipper'}
    className={`w-full h-10 p-2 border border-gray-300 rounded-md ${userType === 'Shipper' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
  />

  <input
    type="text"
    placeholder="Fleet Size"
    disabled={userType === 'Shipper'}
    className={`w-full h-10 p-2 border border-gray-300 rounded-md ${userType === 'Shipper' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
  />

  {/* Company Name & Carrier Type */}
  <input type="text" placeholder="Company Name" className="w-full h-10 p-2 border border-gray-300 rounded-md" />
  <input type="text" placeholder="Carrier Type" className="w-full h-10 p-2 border border-gray-300 rounded-md" />

  {/*Company Address spans both columns */}
  <input
    type="text"
    placeholder="Company Address"
    className="col-span-2 w-full h-10 p-2 border border-gray-300 rounded-md"
  />

  <input type="text" placeholder="Country" className="w-full h-10 p-2 border border-gray-300 rounded-md" />
  <input type="text" placeholder="State" className="w-full h-10 p-2 border border-gray-300 rounded-md" />
  <input type="text" placeholder="City" className="w-full h-10 p-2 border border-gray-300 rounded-md" />
  <input type="text" placeholder="Zip Code" className="w-full h-10 p-2 border border-gray-300 rounded-md" />
  <input type="text" placeholder="IN +91" className="w-full h-10 p-2 border border-gray-300 rounded-md" />
  <input type="text" placeholder="Enter Phone No" className="w-full h-10 p-2 border border-gray-300 rounded-md" />

  {/* Email spans both columns */}
  <input
    type="email"
    placeholder="Enter E-mail"
    className="col-span-2 w-full h-10 p-2 border border-gray-300 rounded-md"
  />

  <input type="password" placeholder="Create Password" className="w-full h-10 p-2 border border-gray-300 rounded-md" />
  <input type="password" placeholder="Re-enter Password" className="w-full h-10 p-2 border border-gray-300 rounded-md" />

  {/*File input spans both columns */}
  <input
    type="file"
className="col-span-2 w-full border border-gray-300 rounded-md text-base text-gray-500 p-2 file:mr-4
             file:py-2 file:px-4 file:border-0 file:rounded-l-md
             file:bg-gray-200 file:text-gray-800
             hover:file:bg-gray-300 bg-white"
  />
</form>



                    {/* Submit Button */}
                    <div className="mt-6">
                        <button className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition">
                            Submit
                        </button>
                    </div>

                    {/* Bottom Link */}
                    <p className="text-sm text-center text-gray-800 mt-4">
                        Don’t have account?{' '}
                        <a href="#" className="text-blue-600 font-semibold hover:underline">
                            Login
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Signup;
