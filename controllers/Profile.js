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
            message: "User cannot be updated",
            error: error.message,
        });
    }
}

// deleteAccount
// Explore -> How can we schedule this deletion operation say after 5 days - cron jobs
exports.deleteAccount = async (req, res) => {
    try {
        // TODO: Find More on Job Schedule
        // const job = schedule.scheduleJob("10 * * * * *", function () {
        // 	console.log("The answer to life, the universe, and everything!");
        // });
        // console.log(job);

        // get id - middleware decode
        const id = req.body.id;
        // validation
        const userDetails = await User.findById(id);
        if (!userDetails) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        // delete profile
        await Profile.findByIdAndDelete({ _id: userDetails.additonalDetails });
        // also do - unenroll user student from all the enrolled courses - not teacher as course will remain even after teacher leaves
        // delete user
        await User.findByIdAndDelete({ _id: id });

        // return response
        return res.status(200).json({
            success: true,
            message: "User deleted successfully",
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "User cannot be deleted",
        });
    }
}


exports.getAllUserDetails = async (req, res) => {
    try {
        // get id
        const id = req.user.id;

        // validation and get user details - User has only Profile id(additionalDetails), to have Profile data need to populate and exec it
        const userDetails = await User.findById(id).populate("additionalDetails").exec();

        // return response
        return res.status(200).json({
            success: true,
            message: "User data fetched successfully",
            data: userDetails,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "User cannot be fetch",
            error: error.message,
        });
    }
}