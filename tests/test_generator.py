import importlib.util
import json
import sys
import unittest
from pathlib import Path


REPO = Path(__file__).resolve().parents[1]
GENERATOR_PATH = REPO / "src" / "python" / "generate.py"
SOLVER_AVAILABLE = importlib.util.find_spec("ortools") is not None


@unittest.skipUnless(SOLVER_AVAILABLE, "Install requirements.txt to run scheduler tests")
class GeneratorTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        spec = importlib.util.spec_from_file_location("schedule_generator", GENERATOR_PATH)
        cls.generator = importlib.util.module_from_spec(spec)
        sys.modules[spec.name] = cls.generator
        spec.loader.exec_module(cls.generator)

    def test_normalizes_resident_and_rejects_unknown_pgy(self):
        resident = self.generator._norm_resident(
            {"_id": 7, "name": "Alex Resident", "year": 3, "weeksoff": [2, "5"]}
        )

        self.assertEqual(resident["_id"], 7)
        self.assertEqual(resident["offWeeks"], [2, 5])

        with self.assertRaises(ValueError):
            self.generator._norm_resident({"name": "Invalid", "year": 1})

    def test_segment_constraints_override_global_constraints(self):
        global_constraints = {
            "UH": {"min_residents": 1, "max_residents": 1}
        }
        segments = {
            "UH": [
                {"start_week": 1, "end_week": 4, "min_residents": 2, "max_residents": 2}
            ]
        }

        self.assertEqual(
            self.generator.get_week_constraints("UH", 2, global_constraints, segments),
            (2, 2),
        )
        self.assertEqual(
            self.generator.get_week_constraints("UH", 8, global_constraints, segments),
            (1, 1),
        )

    def test_converts_solver_output_to_renderer_shape(self):
        residents = [
            {"_id": 1, "name": "Resident One"},
            {"_id": 2, "name": "Resident Two"},
        ]
        weeks = [
            {
                "week": 1,
                "assignments": [
                    {"residentId": "1", "service": "UH"},
                ],
                "weekOff": [],
            },
            {
                "week": 2,
                "assignments": [],
                "weekOff": [
                    {"residentId": "2"},
                ],
            },
        ]

        result = self.generator.convert_to_ui_format(weeks, residents)

        self.assertEqual(result["Resident One"], ["UH", "UNSCHEDULED"])
        self.assertEqual(result["Resident Two"], ["UNSCHEDULED", "VAC"])
        self.assertEqual(result["weekly_counts"], [1, 0])

    def test_renderer_output_is_json_serializable(self):
        result = self.generator.convert_to_ui_format(
            [{"week": 1, "assignments": [], "weekOff": []}],
            [{"_id": 1, "name": "Resident One"}],
        )

        json.dumps(result)


if __name__ == "__main__":
    unittest.main()
