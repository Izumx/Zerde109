import os
import sys
sys.stdout.reconfigure(encoding='utf-8')
import json
import torch
from datasets import Dataset
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from transformers import TrainingArguments, BitsAndBytesConfig
from trl import SFTTrainer, DataCollatorForCompletionOnlyLM

# Configuration
MODEL_ID = "issai/LLama-3.1-KazLLM-1.0-8B"
TRAIN_DATA = "data/train_instructions.jsonl"
OUTPUT_DIR = "models/kazllm-8b-finetuned"
LORA_R = 16
LORA_ALPHA = 32
BATCH_SIZE = 1 # Keep it low for 8GB VRAM
GRADIENT_ACCUMULATION_STEPS = 8
EPOCHS = 1
LEARNING_RATE = 2e-4
MAX_SEQ_LENGTH = 1024

def load_dataset(file_path):
    print(f"Loading dataset from {file_path}")
    data = []
    with open(file_path, "r", encoding="utf-8") as f:
        for line in f:
            data.append(json.loads(line))
    return Dataset.from_list(data)

def format_prompt(example):
    """Formats the instruction for Llama 3 chat template."""
    messages = example["messages"]
    system_msg = messages[0]["content"]
    user_msg = messages[1]["content"]
    assistant_msg = messages[2]["content"]
    return {
        "text": f"<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n{system_msg}<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n{user_msg}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n{assistant_msg}<|eot_id|>"
    }

def main():
    print("Initializing QLoRA fine-tuning for KazLLM 8B...")
    
    # 1. Load Data
    dataset = load_dataset(TRAIN_DATA)
    dataset = dataset.map(format_prompt)
    print(f"Dataset loaded. Total samples: {len(dataset)}")

    # 2. Setup Quantization (4-bit)
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16,
        bnb_4bit_use_double_quant=True,
    )

    # 3. Load Tokenizer & Model
    print("Loading tokenizer and model (this may take a while)...")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, trust_remote_code=True)
    tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = "right"

    model = AutoModelForCausalLM.from_pretrained(
        MODEL_ID,
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=True,
    )
    
    # 4. Prepare for LoRA
    model = prepare_model_for_kbit_training(model)
    peft_config = LoraConfig(
        r=LORA_R,
        lora_alpha=LORA_ALPHA,
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"]
    )
    model = get_peft_model(model, peft_config)
    model.print_trainable_parameters()

    # 5. Training Arguments
    training_args = TrainingArguments(
        output_dir=OUTPUT_DIR,
        per_device_train_batch_size=BATCH_SIZE,
        gradient_accumulation_steps=GRADIENT_ACCUMULATION_STEPS,
        optim="paged_adamw_32bit",
        save_steps=100,
        logging_steps=10,
        learning_rate=LEARNING_RATE,
        weight_decay=0.001,
        fp16=not torch.cuda.is_bf16_supported(),
        bf16=torch.cuda.is_bf16_supported(),
        max_grad_norm=0.3,
        max_steps=200, # Only doing a few steps for testing initially. Adjust as needed.
        warmup_ratio=0.03,
        group_by_length=True,
        lr_scheduler_type="cosine",
        report_to="none"
    )

    # 6. Trainer
    trainer = SFTTrainer(
        model=model,
        train_dataset=dataset,
        peft_config=peft_config,
        dataset_text_field="text",
        max_seq_length=MAX_SEQ_LENGTH,
        tokenizer=tokenizer,
        args=training_args,
    )

    # 7. Train
    print("Starting training...")
    trainer.train()
    
    # 8. Save
    print(f"Saving fine-tuned model to {OUTPUT_DIR}")
    trainer.model.save_pretrained(OUTPUT_DIR)
    tokenizer.save_pretrained(OUTPUT_DIR)
    print("Done!")

if __name__ == "__main__":
    main()
