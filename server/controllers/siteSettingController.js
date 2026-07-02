const SiteSetting = require("../models/SiteSetting");

exports.getSiteSettings = async (req, res) => {
  try {
    let settings = await SiteSetting.findOne();

    if (!settings) {
      settings = await SiteSetting.create({});
    }

    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch site settings.",
      error: error.message,
    });
  }
};

exports.updateSiteSettings = async (req, res) => {
  try {
    let settings = await SiteSetting.findOne();

    if (!settings) {
      settings = await SiteSetting.create(req.body);
    } else {
      settings = await SiteSetting.findByIdAndUpdate(settings._id, req.body, {
        new: true,
        runValidators: true,
      });
    }

    res.status(200).json({
      message: "Site settings updated successfully.",
      settings,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update site settings.",
      error: error.message,
    });
  }
};
