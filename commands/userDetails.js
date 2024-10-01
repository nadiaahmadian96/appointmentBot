const { loadAppointmentData, saveAppointmentData } = require('../utils/dataHandler');
const { Markup } = require('telegraf');

// View user details (Admin or user)
const viewUserDetails = (ctx) => {
  const appointmentData = loadAppointmentData();
  const userId = ctx.from.id;

  // Find the user by ID
  const user = appointmentData.users.find(user => user.userId === userId);

  if (!user) {
    return ctx.reply('کاربری با این شناسه یافت نشد.');
  }

  // Display user details
  let response = `جزئیات کاربر:\n`;
  response += `نام: ${user.firstName} ${user.lastName}\n`;
  response += `شماره ملی: ${user.idNumber}\n`;
  response += `شماره تلفن: ${user.phoneNumber}\n`;

  ctx.reply(response);
};

// Edit user details
const editUserDetails = (ctx) => {
  const appointmentData = loadAppointmentData();
  const userId = ctx.from.id;

  // Find the user by ID
  const user = appointmentData.users.find(user => user.userId === userId);

  if (!user) {
    return ctx.reply('کاربری با این شناسه یافت نشد.');
  }

  ctx.reply('چه جزئیاتی را می‌خواهید ویرایش کنید؟', Markup.keyboard([['نام', 'نام خانوادگی', 'شماره ملی', 'شماره تلفن']]).resize());
  ctx.session.editUserStep = 'awaitingFieldSelection';  // Track state

  ctx.once('text', (msgCtx) => {
    const field = msgCtx.message.text;

    if (ctx.session.editUserStep === 'awaitingFieldSelection') {
      let fieldName = '';
      switch (field) {
        case 'نام':
          fieldName = 'firstName';
          break;
        case 'نام خانوادگی':
          fieldName = 'lastName';
          break;
        case 'شماره ملی':
          fieldName = 'idNumber';
          break;
        case 'شماره تلفن':
          fieldName = 'phoneNumber';
          break;
        default:
          return ctx.reply('فیلد نامعتبر است.');
      }

      // Ask for new value
      ctx.reply(`لطفا ${field} جدید را وارد کنید:`);
      ctx.session.editUserStep = 'awaitingNewValue';
      ctx.session.fieldName = fieldName;  // Store the field being edited

      ctx.once('text', (msgCtx) => {
        const newValue = msgCtx.message.text;
        user[ctx.session.fieldName] = newValue;  // Update the user field
        saveAppointmentData(appointmentData);

        ctx.reply(`${field} با موفقیت ویرایش شد.`);
        ctx.session = null;  // Clear session data
      });
    }
  });
};

// Admin deletes a user by userId
const deleteUser = (ctx) => {
  const appointmentData = loadAppointmentData();

  // Prompt admin to enter the user's ID
  ctx.reply('لطفا شناسه کاربر را وارد کنید:');
  
  ctx.once('text', (msgCtx) => {
    const userId = parseInt(msgCtx.message.text, 10);
    const userIndex = appointmentData.users.findIndex(user => user.userId === userId);

    if (userIndex === -1) {
      return ctx.reply('کاربری با این شناسه یافت نشد.');
    }

    // Remove the user from the list
    appointmentData.users.splice(userIndex, 1);
    saveAppointmentData(appointmentData);

    ctx.reply('کاربر با موفقیت حذف شد.');
  });
};

module.exports = {
  viewUserDetails,
  editUserDetails,
  deleteUser
};
