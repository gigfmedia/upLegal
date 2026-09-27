/** Historical acquisition campaign is retired. No DB/email/provider side effects. */
export function retiredAITrialInvite(_req, res) {
  return res.status(410).json({
    success: false,
    code: 'AI_TRIAL_INVITE_RETIRED',
    message: 'Esta campaña fue retirada. La oferta actual es LegalUp Pro.',
  });
}
