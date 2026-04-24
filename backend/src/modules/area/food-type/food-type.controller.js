const foodTypeService = require("./food-type.service");

async function getFoodTypes(req, res, next) {
  try {
    const data = await foodTypeService.listFoodTypes();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getFoodTypes,
};
