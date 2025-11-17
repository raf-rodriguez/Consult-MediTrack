export const checkInventoryDiscrepancies = (form, recommended) => {
  const discrepancies = [];

  Object.keys(recommended).forEach(section => {
    const sectionData = form[section];
    const recommendedData = recommended[section];

    Object.keys(recommendedData).forEach(item => {
      const recommendedValue = recommendedData[item];
      const actualValue = sectionData[item];

      if (typeof recommendedValue === "boolean") {
        if (!actualValue) {
          discrepancies.push({
            section,
            item,
            message: `Falta ${item.replaceAll("_", " ")}`
          });
        }
      } else if (typeof recommendedValue === "number") {
        if (actualValue < recommendedValue) {
          discrepancies.push({
            section,
            item,
            message: `${item.replaceAll("_", " ")} tiene ${actualValue} (debería tener ${recommendedValue})`
          });
        }
      }
    });
  });

  return discrepancies;
};
