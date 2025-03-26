const Profile = require("../models/Profile");
const User = require("../models/User");

exports.updateProfile = async (req, res) => {
    try {
        // get data
        const { dateOfBirth = "", about = "", contactNumber, gender } = req.body;
        // get userId - attached by decode in middleware to req
        const id = req.body.id;
        // validation
        if (!contactNumber || !gender || !id) {
            return res.status(400).json({
                success: false,
                message: "All fields are required",
            });
        }
        // find profile
        const userDetails = await User.findById(id);
        const profileId = userDetails.additonalDetails;
        const profileDetails = await Profile.findById(profileId);

        // update profile - used save here instead of create as Profile data is already there with null values
        profileDetails.dateOfBirth = dateOfBirth;
        profileDetails.about = about;
        profileDetails.gender = gender;
        profileDetails.contactNumber = contactNumber;
        await profileDetails.save();
        // return response
        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            profileDetails, // donot send contact number in response
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

// deleteCount
