# Twi voice-data transcripts required

The seven audio clips currently in `processed/wavs` total about 159 seconds, but their
matching text is blank in `processed/metadata.csv`. Audio alone cannot teach a model
what words were spoken, and it cannot be used for valid Twi voice training.

For every clip, enter the exact spoken Twi text using this format:

```text
clip_id|exact Twi transcript|normalised Twi transcript
```

Once every row is filled, record and label at least ten minutes of a single native
speaker (30–60 minutes is recommended), then run:

```bash
cd backend
./venv/bin/python -m dataset.train_custom_voice
```

Completed rows also allow Voxa to play the original native recording when a translated
phrase exactly matches the transcript. This is the most accurate option for the
phrases covered by the recordings.
