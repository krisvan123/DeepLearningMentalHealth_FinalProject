"""Run actual Transformer inference on demonstration inputs (not an evaluation set)."""
from model.model_loader import load_model,load_tokenizer
from model.predictor import Predictor
import json
if __name__ == '__main__':
    model,error=load_model();tokenizer,tok_error=load_tokenizer()
    if error or tok_error: raise SystemExit(error or tok_error)
    predictor=Predictor(model,tokenizer)
    for text in ['I feel nervous about tomorrow.','I enjoyed a calm day with a friend.']:
        print(json.dumps(predictor.predict(text),indent=2))
