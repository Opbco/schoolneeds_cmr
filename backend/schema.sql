SELECT 
        COALESCE(SUM(struct.number_of_divisions * curr.weekly_hours), 0)
    INTO p_total_hours_needed
    FROM school_structure_inputs struct
    JOIN curriculum_matrix curr 
        ON struct.class_level_id = curr.class_level_id 
        AND struct.series_id = curr.series_id
    JOIN ref_subjects subj 
        ON curr.subject_id = subj.id
    WHERE struct.school_id = p_school_id
      AND subj.domain_id = p_domain_id;