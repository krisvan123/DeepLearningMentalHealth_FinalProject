"""Dataset leakage, evidence integrity and checkpoint attribution regressions."""
import copy
import json
import unittest
from pathlib import Path
from scripts.prepare_dataset import LABELS, clean_splits, normalized_key, sha256
from scripts.publish_experiment import validate_report
ROOT=Path(__file__).resolve().parents[1]


class DatasetTests(unittest.TestCase):
    def examples(self):
        train=[{'text':f'{label} train {i}','label':label} for label in LABELS for i in range(30)]
        test=[{'text':f'{label} test','label':label} for label in LABELS]
        return train,test
    def test_no_duplicate_or_conflicting_text_in_any_split(self):
        train,test=self.examples()
        train.extend([dict(train[0]),dict(test[0]),{'text':'Conflict','label':LABELS[0]},{'text':' CONFLICT ','label':LABELS[1]}])
        splits,stats=clean_splits(train,test)
        keys=[normalized_key(row['text']) for rows in splits.values() for row in rows]
        self.assertEqual(len(keys),len(set(keys)))
        self.assertNotIn('conflict',keys)
        self.assertEqual(stats['conflicting_texts'],1)
        self.assertEqual(len(splits['test']),4)
        for rows in splits.values(): self.assertEqual({r['label'] for r in rows},set(LABELS))
    def test_split_is_reproducible(self):
        train,test=self.examples()
        self.assertEqual(clean_splits(train,test),clean_splits(train,test))
    def test_missing_class_fails(self):
        train,test=self.examples()
        with self.assertRaises(ValueError): clean_splits([r for r in train if r['label']!=LABELS[0]],test)


class EvidenceTests(unittest.TestCase):
    def report(self):
        return json.loads((ROOT/'models/transformer/training_report.json').read_text())
    def test_metrics_match_confusion_matrix_and_weights(self):
        value=self.report()
        validate_report(value)
        self.assertEqual(sha256(ROOT/'models/transformer/model.safetensors'),value['checkpoint_sha256'])
    def test_bad_or_fabricated_metrics_rejected(self):
        for score in (float('nan'),0.999,2.):
            value=self.report();value['models']['Transformer']['holdout']['accuracy']=score
            with self.assertRaises(ValueError): validate_report(value)
    def test_browser_python_and_dashboard_same_checkpoint(self):
        report=self.report()
        for path in ['frontend/lib/model-spec.json','frontend/public/models/mindcare-transformer/runtime.json','frontend/public/research/transformer.json']:
            self.assertEqual(json.loads((ROOT/path).read_text())['checkpoint_sha256'],report['checkpoint_sha256'])
    def test_dataset_source_recorded(self):
        manifest=json.loads((ROOT/'research/dataset_manifest.json').read_text())
        self.assertEqual(manifest['license']['declared'],'CC-BY-4.0')
        self.assertTrue(manifest['revision'])
        self.assertTrue(manifest['source_url'].startswith('https://huggingface.co/datasets/'))
