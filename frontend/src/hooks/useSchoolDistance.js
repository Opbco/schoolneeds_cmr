import { useState, useCallback } from 'react';
import { calculateDistance } from '../utils/distance';

const useSchoolDistance = () => {
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [anchorSchool, setAnchorSchool] = useState(null);
  const [targetSchool, setTargetSchool] = useState(null);
  const [distance, setDistance] = useState(null);
  const [radius, setRadius] = useState(5); // Default radius 5km

  const startMeasuring = () => {
    setIsMeasuring(true);
    setAnchorSchool(null);
    setTargetSchool(null);
    setDistance(null);
    setRadius(5); // Reset to default
  };

  const stopMeasuring = () => {
    setIsMeasuring(false);
    setAnchorSchool(null);
    setTargetSchool(null);
    setDistance(null);
  };

  const resetAnchor = () => {
    setAnchorSchool(null);
    setTargetSchool(null);
    setDistance(null);
  };

  const selectSchool = useCallback((school) => {
    if (!isMeasuring) return;

    if (!anchorSchool) {
      setAnchorSchool(school);
      setTargetSchool(null);
      setDistance(null);
    } else {
      if (school.id === anchorSchool.id) return;

      setTargetSchool(school);
      const d = calculateDistance(
        anchorSchool.latitude,
        anchorSchool.longitude,
        school.latitude,
        school.longitude
      );
      setDistance(d);
    }
  }, [isMeasuring, anchorSchool]);

  return {
    isMeasuring,
    startMeasuring,
    stopMeasuring,
    resetAnchor,
    anchorSchool,
    targetSchool,
    distance,
    radius,
    setRadius,
    selectSchool
  };
};

export default useSchoolDistance;
