import dotenv from "dotenv";
import { OTP } from "../schemas/otp.schema.js";
// import nodemailer from "nodemailer";
import fetch from "node-fetch";
import UserSchema from "../schemas/User.schema.js";
import bcrypt from "bcryptjs";
dotenv.config()
const salt = bcrypt.genSaltSync(10);

export const createOTP = async (req, res) => {
  try {
    const { email } = req.body;

    console.log("Sending OTP to:", email);

    const user = await UserSchema.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();

    await OTP.create({
      email,
      otp: generatedOTP,
      createdAt: Date.now(),
    });

    // SEND EMAIL USING BREVO API (NO SMTP)
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": process.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { name: "SMF App", email: "ashishfarnish135@gmail.com" },
        to: [{ email }],
        subject: "Your OTP Code",
        htmlContent: `<h2>Your OTP is: <b>${generatedOTP}</b></h2>`,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Brevo API Error:", data);
      return res.status(500).json({ message: "Failed to send OTP" });
    }

    res.status(200).json({ message: "OTP sent successfully" });

  } catch (error) {
    console.error("Error creating OTP:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};



export const changePasswordWithOTP = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const otpEntry = await OTP.findOne({ email, otp }).sort({ createdAt: -1 });
    if (!otpEntry) {
      return res.status(400).json({ message: "Invalid OTP" });
    }
   if(otpEntry.is_expired=== true){
    return res.status(400).json({ message: "OTP has expired" });
   }
    const user = await UserSchema.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const hashedPassword = bcrypt.hashSync(newPassword, salt);
    user.password = hashedPassword;
    await user.save();
    await OTP.deleteMany({ email });

    res.status(200).json({ message: "Password changed successfully" });
  }
    catch (error) {
    console.error("Error changing password with OTP:", error);
    res.status(500).json({ message: "Internal server error" });
  } 
};